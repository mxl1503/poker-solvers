#pragma once

#include <algorithm>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <numeric>
#include <vector>

#include "cards.h"
#include "game_tree.h"
#include "hand_eval.h"

namespace cfr {

class CfrEngine {
   public:
    CfrEngine(const GameTree& tree,
              std::vector<Combo> oop_combos,
              std::vector<Combo> ip_combos,
              const std::vector<Card>& board)
        : tree_(tree),
          oop_combos_(std::move(oop_combos)),
          ip_combos_(std::move(ip_combos)) {
        auto num_oop = static_cast<int>(oop_combos_.size());
        auto num_ip = static_cast<int>(ip_combos_.size());
        max_hands_ = std::max(num_oop, num_ip);

        oop_ranks_.resize(num_oop);
        ip_ranks_.resize(num_ip);
        for (auto i = 0; i < num_oop; ++i)
            oop_ranks_[i] = evaluate(oop_combos_[i].cards, board);
        for (auto i = 0; i < num_ip; ++i)
            ip_ranks_[i] = evaluate(ip_combos_[i].cards, board);

        sort_by_rank(oop_combos_, oop_ranks_);
        sort_by_rank(ip_combos_, ip_ranks_);

        conflicts_.resize(num_oop * num_ip, false);
        valid_pairs_ = 0;
        for (auto i = 0; i < num_oop; ++i)
            for (auto j = 0; j < num_ip; ++j) {
                auto conflict = oop_combos_[i].conflicts_with(ip_combos_[j]);
                conflicts_[i * num_ip + j] = conflict;
                if (!conflict) ++valid_pairs_;
            }

        auto slots = tree.num_nodes() * max_hands_;
        regrets_.resize(slots);
        strat_sums_.resize(slots);
    }

    auto train(int iterations) -> void {
        auto num_oop = static_cast<int>(oop_combos_.size());
        auto num_ip = static_cast<int>(ip_combos_.size());
        auto total = 0.0;
        auto tick = std::max(1, iterations / 20);

        for (auto i = 0; i < iterations; ++i) {
            for (auto h0 = 0; h0 < num_oop; ++h0)
                for (auto h1 = 0; h1 < num_ip; ++h1) {
                    if (conflicts_[h0 * num_ip + h1]) continue;
                    total += cfr(tree_.root_id(), h0, h1, 1.0, 1.0);
                }
            if ((i + 1) % tick == 0 || i + 1 == iterations)
                std::cerr << "\r  iter " << (i + 1) << " / " << iterations << std::flush;
        }
        std::cerr << "\n";
        game_value_ = total / (static_cast<double>(iterations) * valid_pairs_);
    }

    auto game_value() const -> double { return game_value_; }

    auto avg_strategy(int node_id, int hand_idx) const -> std::vector<double> {
        auto& sums = strat_sums_[slot(node_id, hand_idx)];
        auto total = 0.0;
        for (auto v : sums) total += v;

        auto strat = std::vector<double>(sums.size());
        if (total > 1e-7) {
            for (auto i = size_t{0}; i < sums.size(); ++i) strat[i] = sums[i] / total;
        } else {
            auto u = sums.empty() ? 0.0 : 1.0 / static_cast<double>(sums.size());
            for (auto i = size_t{0}; i < sums.size(); ++i) strat[i] = u;
        }
        return strat;
    }

    auto has_strategy(int node_id, int hand_idx) const -> bool {
        auto& sums = strat_sums_[slot(node_id, hand_idx)];
        auto total = 0.0;
        for (auto v : sums) total += v;
        return total > 1e-7;
    }

    auto num_hands(int player) const -> int {
        return static_cast<int>((player == 0) ? oop_combos_.size() : ip_combos_.size());
    }

    auto combo(int player, int idx) const -> const Combo& {
        return (player == 0) ? oop_combos_[idx] : ip_combos_[idx];
    }

   private:
    const GameTree& tree_;
    std::vector<Combo> oop_combos_;
    std::vector<Combo> ip_combos_;
    std::vector<int> oop_ranks_;
    std::vector<int> ip_ranks_;
    std::vector<bool> conflicts_;
    int max_hands_ = 0;
    int valid_pairs_ = 0;
    double game_value_ = 0.0;

    std::vector<std::vector<double>> regrets_;
    std::vector<std::vector<double>> strat_sums_;

    auto slot(int node_id, int hand_idx) const -> int {
        return node_id * max_hands_ + hand_idx;
    }

    auto get_strategy(int node_id, int hand_idx, int n, double reach) -> std::vector<double> {
        auto s = slot(node_id, hand_idx);
        auto& r = regrets_[s];
        auto& ss = strat_sums_[s];
        if (static_cast<int>(r.size()) != n) r.assign(n, 0.0);
        if (static_cast<int>(ss.size()) != n) ss.assign(n, 0.0);

        auto st = std::vector<double>(n);
        auto norm = 0.0;
        for (auto i = 0; i < n; ++i) {
            st[i] = std::max(r[i], 0.0);
            norm += st[i];
        }
        for (auto i = 0; i < n; ++i) {
            st[i] = (norm > 0) ? st[i] / norm : 1.0 / n;
            ss[i] += reach * st[i];
        }
        return st;
    }

    auto cfr(int node_id, int h0, int h1, double pi0, double pi1) -> double {
        auto& nd = tree_.node(node_id);
        if (nd.terminal) return tree_.terminal_util(node_id, oop_ranks_[h0], ip_ranks_[h1]);

        auto p = nd.player;
        auto hand_idx = (p == 0) ? h0 : h1;
        auto n = static_cast<int>(nd.actions.size());

        auto st = get_strategy(node_id, hand_idx, n, (p == 0) ? pi0 : pi1);
        auto util = std::vector<double>(n);
        auto ev = 0.0;

        for (auto i = 0; i < n; ++i) {
            auto child_val = (p == 0) ? cfr(nd.children[i], h0, h1, pi0 * st[i], pi1)
                                      : cfr(nd.children[i], h0, h1, pi0, pi1 * st[i]);
            util[i] = -child_val;
            ev += st[i] * util[i];
        }

        auto opp = (p == 0) ? pi1 : pi0;
        auto& reg = regrets_[slot(node_id, hand_idx)];
        for (auto i = 0; i < n; ++i) reg[i] += opp * (util[i] - ev);

        return ev;
    }

    static auto sort_by_rank(std::vector<Combo>& combos, std::vector<int>& ranks) -> void {
        auto n = static_cast<int>(combos.size());
        auto idx = std::vector<int>(n);
        std::iota(idx.begin(), idx.end(), 0);
        std::sort(idx.begin(), idx.end(), [&](int a, int b) { return ranks[a] < ranks[b]; });

        auto sc = std::vector<Combo>(n);
        auto sr = std::vector<int>(n);
        for (auto i = 0; i < n; ++i) {
            sc[i] = combos[idx[i]];
            sr[i] = ranks[idx[i]];
        }
        combos = std::move(sc);
        ranks = std::move(sr);
    }
};

// ─── Output ─────────────────────────────────────────────────────────────────────

inline auto print_subtree(const GameTree& tree,
                          const CfrEngine& engine,
                          int node_id,
                          std::ostream& out,
                          const std::string& indent) -> void {
    auto& nd = tree.node(node_id);
    if (nd.terminal) return;

    auto num_h = engine.num_hands(nd.player);
    for (auto h = 0; h < num_h; ++h) {
        if (!engine.has_strategy(node_id, h)) continue;
        auto strat = engine.avg_strategy(node_id, h);
        out << indent << engine.combo(nd.player, h).label();
        for (auto i = size_t{0}; i < nd.actions.size(); ++i) {
            auto freq = strat[i];
            if (freq < 1e-4) freq = 0.0;
            out << "  " << nd.actions[i].tag << ":" << freq;
        }
        out << "\n";
    }
    out << "\n";

    for (auto i = size_t{0}; i < nd.children.size(); ++i) {
        auto child_id = nd.children[i];
        auto& child = tree.node(child_id);

        if (child.terminal) {
            if (child.is_fold) {
                auto winner = (child.player == 0) ? "OOP" : "IP";
                out << indent << nd.actions[i].tag << " -> " << winner << " wins\n";
            } else {
                out << indent << nd.actions[i].tag << " -> showdown\n";
            }
        } else {
            auto cp = (child.player == 0) ? "OOP" : "IP";
            out << indent << nd.actions[i].tag << " -> " << cp << " to act\n";
            print_subtree(tree, engine, child_id, out, indent + "  ");
        }
    }
}

inline auto print_tree(const GameTree& tree,
                       const CfrEngine& engine,
                       std::ostream& out) -> void {
    out << std::fixed << std::setprecision(4);
    out << "\nGame value (OOP): " << engine.game_value() << " bb\n\n";
    out << "Game tree\n";
    out << std::string(60, '=') << "\n\n";

    auto& root = tree.node(tree.root_id());
    auto player = (root.player == 0) ? "OOP" : "IP";
    out << "(root) " << player << " to act\n";
    print_subtree(tree, engine, tree.root_id(), out, "  ");
}

}  // namespace cfr

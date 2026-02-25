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
#include "json.hpp"

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
        auto tick = std::max(1, iterations / 20);
        for (auto i = 0; i < iterations; i += tick) {
            auto batch = std::min(tick, iterations - i);
            train_batch(batch);
            std::cerr << "\r  iter " << (i + batch) << " / " << iterations << std::flush;
        }
        std::cerr << "\n";
    }

    auto train_until(double target_pct_pot, double pot, int max_iters) -> int {
        auto check = 250;
        std::cerr << std::fixed << std::setprecision(4);
        while (total_iters_ < max_iters) {
            auto batch = std::min(check, max_iters - total_iters_);
            train_batch(batch);
            auto exploit = exploitability();
            auto pct = exploit / pot * 100.0;
            std::cerr << "  iter " << total_iters_
                      << "  exploit=" << pct << "% pot\n";
            if (pct <= target_pct_pot) return total_iters_;
            check = std::min(check * 2, 5000);
        }
        std::cerr << "  max iterations reached\n";
        return total_iters_;
    }

    auto game_value() const -> double { return game_value_; }
    auto total_iterations() const -> int { return total_iters_; }

    auto exploitability() const -> double {
        auto num_oop = static_cast<int>(oop_combos_.size());
        auto num_ip = static_cast<int>(ip_combos_.size());

        auto oop_br = 0.0;
        for (auto h0 = 0; h0 < num_oop; ++h0) {
            auto ip_reach = std::vector<double>(num_ip);
            for (auto h1 = 0; h1 < num_ip; ++h1)
                ip_reach[h1] = conflicts_[h0 * num_ip + h1] ? 0.0 : 1.0;
            oop_br += br_oop(tree_.root_id(), h0, ip_reach);
        }

        auto ip_br = 0.0;
        for (auto h1 = 0; h1 < num_ip; ++h1) {
            auto oop_reach = std::vector<double>(num_oop);
            for (auto h0 = 0; h0 < num_oop; ++h0)
                oop_reach[h0] = conflicts_[h0 * num_ip + h1] ? 0.0 : 1.0;
            ip_br += br_ip(tree_.root_id(), h1, oop_reach);
        }

        return (oop_br + ip_br) / valid_pairs_;
    }

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
    int total_iters_ = 0;
    double total_value_ = 0.0;
    double game_value_ = 0.0;

    std::vector<std::vector<double>> regrets_;
    std::vector<std::vector<double>> strat_sums_;

    auto slot(int node_id, int hand_idx) const -> int {
        return node_id * max_hands_ + hand_idx;
    }

    auto train_batch(int n) -> void {
        auto num_oop = static_cast<int>(oop_combos_.size());
        auto num_ip = static_cast<int>(ip_combos_.size());
        for (auto i = 0; i < n; ++i) {
            for (auto h0 = 0; h0 < num_oop; ++h0)
                for (auto h1 = 0; h1 < num_ip; ++h1) {
                    if (conflicts_[h0 * num_ip + h1]) continue;
                    total_value_ += cfr(tree_.root_id(), h0, h1, 1.0, 1.0);
                }
            ++total_iters_;
        }
        game_value_ = total_value_ / (static_cast<double>(total_iters_) * valid_pairs_);
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

    auto br_oop(int node_id, int h0,
                const std::vector<double>& ip_reach) const -> double {
        auto& nd = tree_.node(node_id);
        if (nd.terminal) {
            auto val = 0.0;
            for (auto h1 = 0; h1 < static_cast<int>(ip_reach.size()); ++h1) {
                if (ip_reach[h1] < 1e-15) continue;
                auto raw = tree_.terminal_util(node_id, oop_ranks_[h0], ip_ranks_[h1]);
                val += ip_reach[h1] * ((nd.player == 0) ? raw : -raw);
            }
            return val;
        }
        auto n_acts = static_cast<int>(nd.actions.size());
        if (nd.player == 0) {
            auto best = -1e18;
            for (auto a = 0; a < n_acts; ++a)
                best = std::max(best, br_oop(nd.children[a], h0, ip_reach));
            return best;
        }
        auto total = 0.0;
        for (auto a = 0; a < n_acts; ++a) {
            auto nr = ip_reach;
            for (auto h1 = 0; h1 < static_cast<int>(nr.size()); ++h1) {
                if (nr[h1] < 1e-15) continue;
                nr[h1] *= avg_strategy(node_id, h1)[a];
            }
            total += br_oop(nd.children[a], h0, nr);
        }
        return total;
    }

    auto br_ip(int node_id, int h1,
               const std::vector<double>& oop_reach) const -> double {
        auto& nd = tree_.node(node_id);
        if (nd.terminal) {
            auto val = 0.0;
            for (auto h0 = 0; h0 < static_cast<int>(oop_reach.size()); ++h0) {
                if (oop_reach[h0] < 1e-15) continue;
                auto raw = tree_.terminal_util(node_id, oop_ranks_[h0], ip_ranks_[h1]);
                val += oop_reach[h0] * ((nd.player == 1) ? raw : -raw);
            }
            return val;
        }
        auto n_acts = static_cast<int>(nd.actions.size());
        if (nd.player == 1) {
            auto best = -1e18;
            for (auto a = 0; a < n_acts; ++a)
                best = std::max(best, br_ip(nd.children[a], h1, oop_reach));
            return best;
        }
        auto total = 0.0;
        for (auto a = 0; a < n_acts; ++a) {
            auto nr = oop_reach;
            for (auto h0 = 0; h0 < static_cast<int>(nr.size()); ++h0) {
                if (nr[h0] < 1e-15) continue;
                nr[h0] *= avg_strategy(node_id, h0)[a];
            }
            total += br_ip(nd.children[a], h1, nr);
        }
        return total;
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
    auto exploit = engine.exploitability();
    out << "\nGame value (OOP): " << engine.game_value() << " bb\n";
    out << "Exploitability:   " << exploit << " bb ("
        << (exploit / tree.initial_pot() * 100.0) << "% pot)\n\n";
    out << "Game tree\n";
    out << std::string(60, '=') << "\n\n";

    auto& root = tree.node(tree.root_id());
    auto player = (root.player == 0) ? "OOP" : "IP";
    out << "(root) " << player << " to act\n";
    print_subtree(tree, engine, tree.root_id(), out, "  ");
}

// ─── JSON export ────────────────────────────────────────────────────────────────

inline auto export_json(const GameTree& tree,
                        const CfrEngine& engine,
                        const std::string& board,
                        const std::string& oop_range,
                        const std::string& ip_range,
                        double pot, double stack) -> nlohmann::json {
    auto exploit = engine.exploitability();
    auto j = nlohmann::json{};
    j["meta"] = {
        {"board", board},
        {"pot", pot},
        {"stack", stack},
        {"gameValueOop", engine.game_value()},
        {"iterations", engine.total_iterations()},
        {"oopRange", oop_range},
        {"ipRange", ip_range},
        {"exploitability", exploit},
        {"exploitabilityPctPot", exploit / pot * 100.0}
    };

    auto nodes = nlohmann::json::array();
    for (auto id = 0; id < tree.num_nodes(); ++id) {
        auto& nd = tree.node(id);
        auto node_json = nlohmann::json{};
        node_json["id"] = id;
        node_json["player"] = nd.player;
        node_json["terminal"] = nd.terminal;
        node_json["isFold"] = nd.is_fold;
        node_json["pot"] = nd.pot;
        node_json["stacks"] = {nd.stacks[0], nd.stacks[1]};
        node_json["label"] = nd.label;

        auto action_tags = nlohmann::json::array();
        for (auto& a : nd.actions) action_tags.push_back(a.tag);
        node_json["actions"] = action_tags;
        node_json["children"] = nd.children;

        if (!nd.terminal) {
            auto strategy = nlohmann::json::object();
            auto num_h = engine.num_hands(nd.player);
            for (auto h = 0; h < num_h; ++h) {
                if (!engine.has_strategy(id, h)) continue;
                auto strat = engine.avg_strategy(id, h);
                for (auto& f : strat)
                    if (f < 1e-4) f = 0.0;
                strategy[engine.combo(nd.player, h).label()] = strat;
            }
            node_json["strategy"] = strategy;
        }

        nodes.push_back(node_json);
    }
    j["nodes"] = nodes;
    return j;
}

}  // namespace cfr

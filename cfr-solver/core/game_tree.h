#pragma once

#include <algorithm>
#include <cmath>
#include <sstream>
#include <string>
#include <vector>

#include "tree_config.h"

namespace cfr {

enum class Act { CHECK, FOLD, BET, CALL, RAISE };

struct Action {
    Act type;
    double amount;
    std::string tag;
};

struct GameNode {
    int player = 0;
    bool terminal = false;
    bool is_fold = false;
    double pot = 0;
    double stacks[2]{};
    std::string label;

    std::vector<Action> actions;
    std::vector<int> children;
};

class GameTree {
   public:
    explicit GameTree(const TreeConfig& cfg)
        : initial_pot_(cfg.setup.pot),
          initial_stack_(cfg.setup.stack),
          max_raises_(cfg.rules.max_raises),
          min_bet_pct_(cfg.rules.min_bet_pct),
          ai_threshold_(cfg.rules.ai_threshold_pct) {
        auto& river = cfg.street("river");
        oop_sizing_ = river.oop;
        ip_sizing_ = river.ip;

        auto root = BuildState{};
        root.pot = initial_pot_;
        root.stacks[0] = root.stacks[1] = initial_stack_;
        build(root);
    }

    auto root_id() const -> int { return 0; }
    auto node(int id) const -> const GameNode& { return nodes_[id]; }
    auto num_nodes() const -> int { return static_cast<int>(nodes_.size()); }
    auto initial_pot() const -> double { return initial_pot_; }
    auto initial_stack() const -> double { return initial_stack_; }

    auto terminal_util(int node_id, int oop_strength, int ip_strength) const -> double {
        auto& n = nodes_[node_id];
        auto viewer = n.player;
        auto hp = initial_pot_ / 2.0;

        if (n.is_fold) {
            auto folder = 1 - viewer;
            auto folder_inv = initial_stack_ - n.stacks[folder];
            return hp + folder_inv;
        }

        auto vs = (viewer == 0) ? oop_strength : ip_strength;
        auto os = (viewer == 0) ? ip_strength : oop_strength;
        auto inv = initial_stack_ - n.stacks[viewer];
        if (vs > os) return hp + inv;
        if (vs < os) return -(hp + inv);
        return 0.0;
    }

   private:
    double initial_pot_;
    double initial_stack_;
    int max_raises_;
    double min_bet_pct_;
    double ai_threshold_;
    Sizing oop_sizing_;
    Sizing ip_sizing_;

    std::vector<GameNode> nodes_;

    struct BuildState {
        double pot = 0;
        double stacks[2]{};
        double invested[2]{};
        int to_act = 0;
        int num_bets = 0;
        std::string history;
        bool terminal = false;
        bool is_fold = false;
    };

    auto build(const BuildState& bs) -> int {
        auto id = static_cast<int>(nodes_.size());
        nodes_.emplace_back();

        nodes_[id].player = bs.to_act;
        nodes_[id].terminal = bs.terminal;
        nodes_[id].is_fold = bs.is_fold;
        nodes_[id].pot = bs.pot;
        nodes_[id].stacks[0] = bs.stacks[0];
        nodes_[id].stacks[1] = bs.stacks[1];
        nodes_[id].label = bs.history;

        if (bs.terminal) return id;

        auto actions = gen_actions(bs);
        auto child_ids = std::vector<int>{};
        child_ids.reserve(actions.size());

        for (auto& act : actions) child_ids.push_back(build(apply(bs, act)));

        nodes_[id].actions = std::move(actions);
        nodes_[id].children = std::move(child_ids);
        return id;
    }

    // ─── action generation ──────────────────────────────────────────────────

    auto gen_actions(const BuildState& s) const -> std::vector<Action> {
        auto a = std::vector<Action>{};
        auto p = s.to_act;
        const auto& sz = (p == 0) ? oop_sizing_ : ip_sizing_;
        auto tc = s.invested[1 - p] - s.invested[p];
        auto stk = s.stacks[p];
        auto thr = ai_threshold_ / 100.0;
        auto min_b = s.pot * min_bet_pct_ / 100.0;

        auto cap = [&](double amt) -> double {
            if (amt >= stk * thr) return stk;
            return std::min(amt, stk);
        };
        auto is_ai = [&](double amt) { return std::abs(amt - stk) < 0.01; };

        if (tc > 1e-9) {
            a.push_back({Act::FOLD, 0.0, "fold"});

            if (stk <= tc + 0.01) {
                a.push_back({Act::CALL, stk, "call"});
                return a;
            }
            a.push_back({Act::CALL, tc, "call"});

            if (s.num_bets < max_raises_) {
                for (auto pct : sz.raise_pcts) {
                    auto extra = s.pot * pct / 100.0;
                    auto amt = cap(tc + extra);
                    if (extra < min_b && !is_ai(amt)) continue;
                    a.push_back({Act::RAISE, amt, is_ai(amt) ? "allin" : "r" + fmt(pct)});
                }
                if (sz.add_all_in && stk > tc + 0.01)
                    a.push_back({Act::RAISE, stk, "allin"});
            }
        } else {
            a.push_back({Act::CHECK, 0.0, "check"});

            if (p == 1 || sz.allow_lead) {
                for (auto pct : sz.bet_pcts) {
                    auto amt = cap(s.pot * pct / 100.0);
                    if (amt < min_b && !is_ai(amt)) continue;
                    a.push_back({Act::BET, amt, is_ai(amt) ? "allin" : "b" + fmt(pct)});
                }
                if (sz.add_all_in) a.push_back({Act::BET, stk, "allin"});
            }
        }

        dedup(a);
        return a;
    }

    static auto apply(const BuildState& s, const Action& a) -> BuildState {
        auto n = s;
        n.history += (s.history.empty() ? "" : ".") + a.tag;

        switch (a.type) {
            case Act::CHECK:
                n.to_act = 1 - s.to_act;
                if (s.to_act == 1 && s.num_bets == 0) n.terminal = true;
                break;
            case Act::FOLD:
                n.to_act = 1 - s.to_act;
                n.terminal = true;
                n.is_fold = true;
                break;
            case Act::BET:
            case Act::RAISE:
                n.invested[s.to_act] += a.amount;
                n.stacks[s.to_act] -= a.amount;
                n.pot += a.amount;
                n.num_bets += 1;
                n.to_act = 1 - s.to_act;
                break;
            case Act::CALL:
                n.invested[s.to_act] += a.amount;
                n.stacks[s.to_act] -= a.amount;
                n.pot += a.amount;
                n.to_act = 1 - s.to_act;
                n.terminal = true;
                break;
        }
        return n;
    }

    // ─── helpers ────────────────────────────────────────────────────────────

    static auto fmt(double pct) -> std::string {
        auto ip = static_cast<int>(pct);
        if (std::abs(pct - ip) < 0.01) return std::to_string(ip);
        auto o = std::ostringstream{};
        o << std::fixed << std::setprecision(1) << pct;
        return o.str();
    }

    static auto dedup(std::vector<Action>& v) -> void {
        auto out = std::vector<Action>{};
        for (auto& act : v) {
            auto dup = false;
            for (auto& existing : out) {
                if (existing.type == act.type &&
                    std::abs(existing.amount - act.amount) < 0.01) {
                    if (act.tag == "allin") existing.tag = "allin";
                    dup = true;
                    break;
                }
            }
            if (!dup) out.push_back(act);
        }
        v = std::move(out);
    }
};

}  // namespace cfr

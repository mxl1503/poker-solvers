#pragma once

#include <fstream>
#include <map>
#include <stdexcept>
#include <string>
#include <vector>

#include "json.hpp"

namespace cfr {

// ─── Shared data types ──────────────────────────────────────────────────────────

struct Sizing {
    std::vector<double> bet_pcts;
    std::vector<double> raise_pcts;
    bool add_all_in = false;
    bool allow_lead = true;
};

struct StreetSizing {
    Sizing oop;
    Sizing ip;
};

struct Setup {
    std::string board;
    std::string starting_street = "river";
    double pot = 20.0;
    double stack = 100.0;
};

struct Ranges {
    std::string oop;
    std::string ip;
};

struct TreeRules {
    int max_raises = 2;
    double min_bet_pct = 20.0;
    double ai_threshold_pct = 67.0;
    bool allow_donk = false;
    bool include_limp_tree = false;
};

// ─── TreeConfig ─────────────────────────────────────────────────────────────────
//
// Parses the JSON format produced by the cfr-tree-builder web UI into a
// structured, solver-agnostic configuration object.  Individual solvers pull
// only the fields they need (e.g. river-node-solver reads setup, rules, and
// sizing.*.river).

class TreeConfig {
   public:
    Setup setup;
    Ranges ranges;
    TreeRules rules;

    // ── constructors ────────────────────────────────────────────────────────

    static auto from_file(const std::string& path) -> TreeConfig {
        auto f = std::ifstream(path);
        if (!f.is_open()) throw std::runtime_error("Cannot open config: " + path);
        return from_json(nlohmann::json::parse(f));
    }

    static auto from_string(const std::string& text) -> TreeConfig {
        return from_json(nlohmann::json::parse(text));
    }

    // ── accessors ───────────────────────────────────────────────────────────

    auto street(const std::string& name) const -> const StreetSizing& {
        auto it = streets_.find(name);
        if (it != streets_.end()) return it->second;
        static const auto empty = StreetSizing{};
        return empty;
    }

    auto has_street(const std::string& name) const -> bool {
        return streets_.count(name) > 0;
    }

    template <typename T>
    auto solver_opt(const std::string& key, T fallback) const -> T {
        if (solver_.contains(key)) return solver_[key].template get<T>();
        return fallback;
    }

   private:
    std::map<std::string, StreetSizing> streets_;
    nlohmann::json solver_;

    static auto from_json(const nlohmann::json& j) -> TreeConfig {
        auto tc = TreeConfig{};

        if (j.contains("setup")) {
            auto& s = j["setup"];
            tc.setup.board = s.value("board", tc.setup.board);
            tc.setup.starting_street = s.value("startingStreet", tc.setup.starting_street);
            tc.setup.pot = s.value("startingPotBb", tc.setup.pot);
            tc.setup.stack = s.value("effectiveStackBb", tc.setup.stack);
        }

        if (j.contains("ranges")) {
            tc.ranges.oop = j["ranges"].value("oop", std::string{});
            tc.ranges.ip = j["ranges"].value("ip", std::string{});
        }

        if (j.contains("treeRules")) {
            auto& r = j["treeRules"];
            tc.rules.max_raises = r.value("maxRaisesPerNode", tc.rules.max_raises);
            tc.rules.min_bet_pct = r.value("minBetSizePctPot", tc.rules.min_bet_pct);
            tc.rules.ai_threshold_pct =
                r.value("allInThresholdPctStack", tc.rules.ai_threshold_pct);
            tc.rules.allow_donk = r.value("allowDonkBets", tc.rules.allow_donk);
            tc.rules.include_limp_tree = r.value("includeLimpTree", tc.rules.include_limp_tree);
        }

        if (j.contains("sizing")) {
            auto& sz = j["sizing"];
            for (auto& name : {"flop", "turn", "river"}) {
                auto ss = StreetSizing{};
                if (sz.contains("oop") && sz["oop"].contains(name))
                    ss.oop = parse_sizing(sz["oop"][name]);
                if (sz.contains("ip") && sz["ip"].contains(name))
                    ss.ip = parse_sizing(sz["ip"][name]);
                if (!ss.oop.bet_pcts.empty() || !ss.ip.bet_pcts.empty() ||
                    !ss.oop.raise_pcts.empty() || !ss.ip.raise_pcts.empty() || ss.oop.add_all_in ||
                    ss.ip.add_all_in) {
                    tc.streets_[name] = ss;
                }
            }
        }

        if (j.contains("solver")) tc.solver_ = j["solver"];

        return tc;
    }

    static auto parse_sizing(const nlohmann::json& n) -> Sizing {
        auto s = Sizing{};
        if (n.contains("betSizesPctPot"))
            s.bet_pcts = n["betSizesPctPot"].get<std::vector<double>>();
        if (n.contains("raiseSizesPctPot"))
            s.raise_pcts = n["raiseSizesPctPot"].get<std::vector<double>>();
        s.add_all_in = n.value("addAllIn", false);
        s.allow_lead = n.value("allowLead", true);
        return s;
    }
};

}  // namespace cfr

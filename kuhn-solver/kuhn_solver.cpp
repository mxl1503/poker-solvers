#include <algorithm>
#include <cstdlib>
#include <iostream>
#include <random>
#include <string>
#include <unordered_map>
#include <vector>

class KuhnSolver {
   public:
    auto train(int iterations) -> double {
        auto deck = std::vector<int>{0, 1, 2};
        auto rng = std::mt19937(std::chrono::system_clock::now().time_since_epoch().count());
        auto total = 0.0;

        for (auto i = 0; i < iterations; ++i) {
            std::shuffle(deck.begin(), deck.end(), rng);
            total += cfr(deck[0], deck[1], "", 1.0, 1.0);
        }

        return total / iterations;
    }

    auto print_average_strategies() -> void {
        std::cout << "\nAverage strategy:\n\n";

        auto info_sets = std::vector<std::string>();
        info_sets.reserve(regrets_.size());
        for (auto& [key, _] : regrets_) info_sets.push_back(key);
        std::sort(info_sets.begin(), info_sets.end());

        constexpr auto EPS = 1e-4;
        for (auto& info_set : info_sets) {
            auto& strat_sum = strategy_sums_[info_set];
            auto sum = strat_sum[0] + strat_sum[1];
            auto check_freq = (sum > 0) ? strat_sum[0] / sum : 0.5;
            auto bet_freq = (sum > 0) ? strat_sum[1] / sum : 0.5;
            if (check_freq < EPS) check_freq = 0.0;
            if (bet_freq < EPS) bet_freq = 0.0;

            std::cout << "  " << info_set << "  " << describe(info_set) << "\n";
            std::cout << "       check/fold: " << check_freq << "   bet/call: " << bet_freq
                      << "\n\n";
        }
    }

   private:
    std::unordered_map<std::string, std::vector<double>> regrets_;
    std::unordered_map<std::string, std::vector<double>> strategy_sums_;

    auto get_strategy(const std::string& key, double reach_prob) -> std::vector<double> {
        auto& regret = regrets_[key];
        auto& strat_sum = strategy_sums_[key];
        if (regret.empty()) regret.resize(2, 0.0);
        if (strat_sum.empty()) strat_sum.resize(2, 0.0);

        auto strategy = std::vector<double>(2, 0.0);
        auto normalizing_sum = 0.0;

        for (auto a = 0; a < 2; ++a) {
            strategy[a] = std::max(regret[a], 0.0);
            normalizing_sum += strategy[a];
        }

        for (auto a = 0; a < 2; ++a) {
            strategy[a] = (normalizing_sum > 0) ? strategy[a] / normalizing_sum : 0.5;
            strat_sum[a] += reach_prob * strategy[a];
        }

        return strategy;
    }

    auto cfr(int c0, int c1, const std::string& history, double pi0, double pi1) -> double {
        auto plays = static_cast<int>(history.size());
        auto player = plays % 2;

        auto payoff = terminal_payoff(c0, c1, history);
        if (payoff != 0) return payoff;

        auto info_key = std::string(1, "JQK"[player == 0 ? c0 : c1]) + history;
        auto strategy = get_strategy(info_key, player == 0 ? pi0 : pi1);

        auto action_util = std::vector<double>(2, 0.0);
        auto node_util = 0.0;

        for (auto a = 0; a < 2; ++a) {
            auto next = history + (a == 0 ? "c" : "b");
            action_util[a] = (player == 0) ? -cfr(c0, c1, next, pi0 * strategy[a], pi1)
                                           : -cfr(c0, c1, next, pi0, pi1 * strategy[a]);
            node_util += strategy[a] * action_util[a];
        }

        auto opp_reach = (player == 0) ? pi1 : pi0;
        auto& regret = regrets_[info_key];
        for (auto a = 0; a < 2; ++a) regret[a] += opp_reach * (action_util[a] - node_util);

        return node_util;
    }

    static auto terminal_payoff(int c0, int c1, const std::string& history) -> double {
        auto plays = static_cast<int>(history.size());
        if (plays < 2) return 0;

        auto mine = (plays % 2 == 0) ? c0 : c1;
        auto theirs = (plays % 2 == 0) ? c1 : c0;

        if (history.back() == 'c') {
            if (history == "cc") return (mine > theirs) ? 1 : -1;
            return 1;
        }
        if (history.substr(plays - 2) == "bb") return (mine > theirs) ? 2 : -2;

        return 0;
    }

    static auto describe(const std::string& info_set) -> std::string {
        auto card = info_set.substr(0, 1);
        auto history = info_set.substr(1);
        auto player = (history.size() % 2 == 0) ? "P1" : "P2";

        if (history.empty()) return player + std::string(" holds ") + card + " (opening action)";
        if (history == "b") return player + std::string(" holds ") + card + " (facing bet)";
        if (history == "c") return player + std::string(" holds ") + card + " (after check)";
        if (history == "cb") return player + std::string(" holds ") + card + " (facing check-bet)";
        return player + std::string(" holds ") + card + " [" + history + "]";
    }
};

auto main(int argc, char* argv[]) -> int {
    auto iterations = (argc > 1) ? std::atoi(argv[1]) : 100000;

    auto solver = KuhnSolver();
    auto avg_value = solver.train(iterations);

    std::cout << "Expected game value: " << -1.0 / 18.0 << "\n";
    std::cout << "Computed average game value:  " << avg_value << "\n";

    solver.print_average_strategies();

    return 0;
}

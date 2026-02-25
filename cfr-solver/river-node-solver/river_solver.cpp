#include <cstdlib>
#include <iostream>
#include <string>
#include <vector>

#include "cards.h"
#include "cfr_engine.h"
#include "game_tree.h"
#include "range.h"
#include "tree_config.h"
#include "util.h"

auto main(int argc, char* argv[]) -> int {
    if (argc < 2) {
        std::cerr << "Usage: " << argv[0] << " <config.json> [iterations]\n";
        return 1;
    }

    auto cfg = cfr::TreeConfig::from_file(argv[1]);
    auto iterations = (argc > 2) ? std::atoi(argv[2]) : cfg.solver_opt("iterations", 10000);

    auto board = cfr::parse_board(cfg.setup.board);
    auto oop_combos = cfr::expand_range(cfg.ranges.oop, board);
    auto ip_combos = cfr::expand_range(cfg.ranges.ip, board);
    auto& river = cfg.street("river");

    std::cout << "River CFR Solver\n";
    std::cout << "  board: " << cfg.setup.board << "\n";
    std::cout << "  pot=" << cfg.setup.pot << " bb  stack=" << cfg.setup.stack << " bb\n";
    std::cout << "  OOP range: " << cfg.ranges.oop << " (" << oop_combos.size() << " combos)\n";
    std::cout << "  IP  range: " << cfg.ranges.ip << " (" << ip_combos.size() << " combos)\n";
    std::cout << "  OOP bets: " << cfr::join_pcts(river.oop.bet_pcts)
              << "%  raises: " << cfr::join_pcts(river.oop.raise_pcts)
              << "%  allin:" << river.oop.add_all_in << "  lead:" << river.oop.allow_lead << "\n";
    std::cout << "  IP  bets: " << cfr::join_pcts(river.ip.bet_pcts)
              << "%  raises: " << cfr::join_pcts(river.ip.raise_pcts)
              << "%  allin:" << river.ip.add_all_in << "\n";
    std::cout << "  max_raises=" << cfg.rules.max_raises << "  iterations=" << iterations << "\n\n";

    auto tree = cfr::GameTree(cfg);
    auto engine = cfr::CfrEngine(tree, std::move(oop_combos), std::move(ip_combos), board);
    engine.train(iterations);
    cfr::print_tree(tree, engine, std::cout);

    return 0;
}

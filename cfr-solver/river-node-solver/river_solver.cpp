#include <cstdlib>
#include <iomanip>
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
        std::cerr << "Usage: " << argv[0]
                  << " <config.json> [iterations | --exploit-pct P] [--json]\n";
        return 1;
    }

    auto json_output = false;
    auto iterations = -1;
    auto target_pct = -1.0;

    for (auto i = 2; i < argc; ++i) {
        auto arg = std::string(argv[i]);
        if (arg == "--json" || arg == "-j")
            json_output = true;
        else if ((arg == "--exploit-pct" || arg == "-e") && i + 1 < argc)
            target_pct = std::atof(argv[++i]);
        else if (iterations < 0)
            iterations = std::atoi(argv[i]);
    }

    auto cfg = cfr::TreeConfig::from_file(argv[1]);

    auto board = cfr::parse_board(cfg.setup.board);
    auto oop_combos = cfr::expand_range(cfg.ranges.oop, board);
    auto ip_combos = cfr::expand_range(cfg.ranges.ip, board);
    auto& river = cfg.street("river");

    std::cerr << "River CFR Solver\n";
    std::cerr << "  board: " << cfg.setup.board << "\n";
    std::cerr << "  pot=" << cfg.setup.pot << " bb  stack=" << cfg.setup.stack << " bb\n";
    std::cerr << "  OOP range: " << cfg.ranges.oop << " (" << oop_combos.size() << " combos)\n";
    std::cerr << "  IP  range: " << cfg.ranges.ip << " (" << ip_combos.size() << " combos)\n";
    std::cerr << "  OOP bets: " << cfr::join_pcts(river.oop.bet_pcts)
              << "%  raises: " << cfr::join_pcts(river.oop.raise_pcts)
              << "%  allin:" << river.oop.add_all_in << "  lead:" << river.oop.allow_lead << "\n";
    std::cerr << "  IP  bets: " << cfr::join_pcts(river.ip.bet_pcts)
              << "%  raises: " << cfr::join_pcts(river.ip.raise_pcts)
              << "%  allin:" << river.ip.add_all_in << "\n";
    std::cerr << "  max_raises=" << cfg.rules.max_raises << "\n";

    auto tree = cfr::GameTree(cfg);
    auto engine = cfr::CfrEngine(tree, std::move(oop_combos), std::move(ip_combos), board);

    if (iterations > 0) {
        std::cerr << "  mode: fixed " << iterations << " iterations\n\n";
        engine.train(iterations);
    } else {
        if (target_pct < 0) target_pct = cfg.solver_opt("targetExploitabilityPctPot", 0.25);
        auto max_iters = cfg.solver_opt("maxIterations", 1000000);
        std::cerr << "  mode: converge to " << target_pct << "% pot  (max " << max_iters
                  << " iters)\n\n";
        engine.train_until(target_pct, cfg.setup.pot, max_iters);
    }

    auto exploit = engine.exploitability();
    std::cerr << std::fixed << std::setprecision(4);
    std::cerr << "\n  Game value (OOP): " << engine.game_value() << " bb"
              << "  (" << engine.total_iterations() << " iterations)\n";
    std::cerr << "  Exploitability:   " << exploit << " bb (" << (exploit / cfg.setup.pot * 100.0)
              << "% pot)\n\n";

    if (json_output) {
        auto j = cfr::export_json(tree, engine, cfg.setup.board, cfg.ranges.oop, cfg.ranges.ip,
                                  cfg.setup.pot, cfg.setup.stack);
        std::cout << j.dump(2) << std::endl;
    } else {
        cfr::print_tree(tree, engine, std::cout);
    }

    return 0;
}

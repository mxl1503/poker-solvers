#pragma once

#include <sstream>
#include <string>
#include <vector>

#include "cards.h"

namespace cfr {

inline auto expand_range(const std::string& range_str,
                         const std::vector<Card>& board) -> std::vector<Combo> {
    auto combos = std::vector<Combo>{};
    auto ss = std::istringstream(range_str);
    auto token = std::string{};

    while (std::getline(ss, token, ',')) {
        while (!token.empty() && token.front() == ' ') token.erase(token.begin());
        while (!token.empty() && token.back() == ' ') token.pop_back();
        if (token.size() < 2) continue;

        auto r1 = parse_rank(token[0]);
        auto r2 = parse_rank(token[1]);
        auto qualifier = (token.size() >= 3) ? token[2] : '\0';

        if (r1 == r2) {
            for (auto s1 = 0; s1 < 4; ++s1) {
                for (auto s2 = s1 + 1; s2 < 4; ++s2) {
                    auto c1 = Card{r1, s1};
                    auto c2 = Card{r2, s2};
                    if (card_blocked(c1, board) || card_blocked(c2, board)) continue;
                    combos.push_back({{c1, c2}});
                }
            }
        } else {
            for (auto s1 = 0; s1 < 4; ++s1) {
                for (auto s2 = 0; s2 < 4; ++s2) {
                    if (qualifier == 's' && s1 != s2) continue;
                    if (qualifier == 'o' && s1 == s2) continue;
                    auto c1 = Card{r1, s1};
                    auto c2 = Card{r2, s2};
                    if (card_blocked(c1, board) || card_blocked(c2, board)) continue;
                    combos.push_back({{c1, c2}});
                }
            }
        }
    }

    return combos;
}

}  // namespace cfr

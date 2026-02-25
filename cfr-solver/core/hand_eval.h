#pragma once

#include <algorithm>
#include <array>
#include <initializer_list>
#include <vector>

#include "cards.h"

namespace cfr {

namespace detail {

inline auto encode_hand(int category, std::initializer_list<int> kickers) -> int {
    auto val = category * 1000000;
    auto m = 1;
    for (auto it = std::rbegin(kickers); it != std::rend(kickers); ++it) {
        val += *it * m;
        m *= 15;
    }
    return val;
}

inline auto eval5(const Card cards[5]) -> int {
    auto ranks = std::array<int, 5>{};
    auto suits = std::array<int, 5>{};
    for (auto i = 0; i < 5; ++i) {
        ranks[i] = cards[i].rank;
        suits[i] = cards[i].suit;
    }
    std::sort(ranks.begin(), ranks.end(), std::greater<>());

    auto is_flush = (suits[0] == suits[1] && suits[1] == suits[2] && suits[2] == suits[3] &&
                     suits[3] == suits[4]);

    auto is_straight = false;
    auto hi = 0;
    if (ranks[0] - ranks[4] == 4 && ranks[0] != ranks[1] && ranks[1] != ranks[2] &&
        ranks[2] != ranks[3] && ranks[3] != ranks[4]) {
        is_straight = true;
        hi = ranks[0];
    }
    if (ranks[0] == 14 && ranks[1] == 5 && ranks[2] == 4 && ranks[3] == 3 && ranks[4] == 2) {
        is_straight = true;
        hi = 5;
    }

    auto groups = std::array<std::pair<int, int>, 5>{};
    auto ng = 0;
    for (auto i = 0; i < 5;) {
        auto j = i + 1;
        while (j < 5 && ranks[j] == ranks[i]) ++j;
        groups[ng++] = {j - i, ranks[i]};
        i = j;
    }
    std::sort(groups.begin(), groups.begin() + ng, [](auto& a, auto& b) {
        return (a.first != b.first) ? a.first > b.first : a.second > b.second;
    });

    if (is_straight && is_flush) return encode_hand(8, {hi});
    if (groups[0].first == 4) return encode_hand(7, {groups[0].second, groups[1].second});
    if (groups[0].first == 3 && groups[1].first == 2)
        return encode_hand(6, {groups[0].second, groups[1].second});
    if (is_flush) return encode_hand(5, {ranks[0], ranks[1], ranks[2], ranks[3], ranks[4]});
    if (is_straight) return encode_hand(4, {hi});
    if (groups[0].first == 3)
        return encode_hand(3, {groups[0].second, groups[1].second, groups[2].second});
    if (groups[0].first == 2 && ng >= 2 && groups[1].first == 2)
        return encode_hand(2, {groups[0].second, groups[1].second, groups[2].second});
    if (groups[0].first == 2)
        return encode_hand(
            1, {groups[0].second, groups[1].second, groups[2].second, groups[3].second});
    return encode_hand(0, {ranks[0], ranks[1], ranks[2], ranks[3], ranks[4]});
}

}  // namespace detail

// Returns a comparable integer rank for the best 5-card hand from 2 hole + 5 board cards.
// Higher value = stronger hand.
inline auto evaluate(const Card hole[2], const std::vector<Card>& board) -> int {
    auto all = std::array<Card, 7>{};
    all[0] = hole[0];
    all[1] = hole[1];
    for (auto i = 0; i < 5; ++i) all[i + 2] = board[i];

    auto best = 0;
    for (auto skip1 = 0; skip1 < 7; ++skip1) {
        for (auto skip2 = skip1 + 1; skip2 < 7; ++skip2) {
            Card five[5];
            auto idx = 0;
            for (auto i = 0; i < 7; ++i) {
                if (i == skip1 || i == skip2) continue;
                five[idx++] = all[i];
            }
            best = std::max(best, detail::eval5(five));
        }
    }
    return best;
}

}  // namespace cfr

#pragma once

#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

namespace cfr {

struct Card {
    int rank;  // 2..14 (2=deuce, 14=ace)
    int suit;  // 0=c, 1=d, 2=h, 3=s

    auto operator==(const Card& o) const -> bool { return rank == o.rank && suit == o.suit; }
};

struct Combo {
    Card cards[2];

    auto label() const -> std::string {
        auto rc = [](int r) -> char {
            if (r == 14) return 'A';
            if (r == 13) return 'K';
            if (r == 12) return 'Q';
            if (r == 11) return 'J';
            if (r == 10) return 'T';
            return static_cast<char>('0' + r);
        };
        constexpr char sc[] = "cdhs";
        auto s = std::string{};
        s += rc(cards[0].rank);
        s += sc[cards[0].suit];
        s += rc(cards[1].rank);
        s += sc[cards[1].suit];
        return s;
    }

    auto conflicts_with(const Combo& o) const -> bool {
        for (auto& a : cards)
            for (auto& b : o.cards)
                if (a == b) return true;
        return false;
    }
};

inline auto parse_rank(char c) -> int {
    switch (c) {
        case 'A': return 14;
        case 'K': return 13;
        case 'Q': return 12;
        case 'J': return 11;
        case 'T': return 10;
        default:
            if (c >= '2' && c <= '9') return c - '0';
            throw std::runtime_error(std::string("Invalid rank: ") + c);
    }
}

inline auto parse_suit(char c) -> int {
    switch (c) {
        case 'c': return 0;
        case 'd': return 1;
        case 'h': return 2;
        case 's': return 3;
        default: throw std::runtime_error(std::string("Invalid suit: ") + c);
    }
}

inline auto parse_card(const std::string& s) -> Card {
    if (s.size() != 2) throw std::runtime_error("Invalid card: " + s);
    return {parse_rank(s[0]), parse_suit(s[1])};
}

inline auto parse_board(const std::string& s) -> std::vector<Card> {
    auto cards = std::vector<Card>{};
    auto ss = std::istringstream(s);
    auto token = std::string{};
    while (ss >> token) cards.push_back(parse_card(token));
    return cards;
}

inline auto card_blocked(const Card& c, const std::vector<Card>& board) -> bool {
    for (auto& b : board)
        if (c == b) return true;
    return false;
}

}  // namespace cfr

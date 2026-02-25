#pragma once

#include <string>
#include <vector>

namespace cfr {

inline auto join_pcts(const std::vector<double>& v) -> std::string {
    auto s = std::string{};
    for (auto i = size_t{0}; i < v.size(); ++i) {
        if (i) s += ",";
        s += std::to_string(static_cast<int>(v[i]));
    }
    return s.empty() ? std::string("(none)") : s;
}

}  // namespace cfr

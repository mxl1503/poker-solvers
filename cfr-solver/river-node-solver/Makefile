CXX := g++
CORE := ../core
CXXFLAGS := -std=c++20 -O2 -Wall -Wextra -pedantic -I$(CORE)
TARGET := river_solver
SRC := river_solver.cpp
CONFIG ?= examples/river_config.json
ITER ?=

.PHONY: all run lint clean

all: $(TARGET)

$(CORE)/json.hpp:
	$(MAKE) -C $(CORE) deps

CORE_HDRS := $(CORE)/tree_config.h $(CORE)/game_tree.h $(CORE)/cfr_engine.h \
             $(CORE)/cards.h $(CORE)/hand_eval.h $(CORE)/range.h $(CORE)/util.h

$(TARGET): $(SRC) $(CORE)/json.hpp $(CORE_HDRS)
	$(CXX) $(CXXFLAGS) $(SRC) -o $(TARGET)

run: $(TARGET)
	./$(TARGET) $(CONFIG) $(ITER)

json: $(TARGET)
	./$(TARGET) $(CONFIG) $(ITER) --json

lint:
	$(CXX) -std=c++20 -I$(CORE) -Wall -Wextra -pedantic -Werror -fsyntax-only $(SRC)
	clang-format --dry-run --Werror $(SRC)

clean:
	rm -f $(TARGET)

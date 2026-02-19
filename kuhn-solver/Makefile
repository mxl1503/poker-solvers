CXX := g++
CXXFLAGS := -std=c++20 -O2 -Wall -Wextra -pedantic
TARGET := kuhn_solver
SRC := main.cc
ITER ?= 100000000

.PHONY: all run lint clean

all: $(TARGET)

$(TARGET): $(SRC)
	$(CXX) $(CXXFLAGS) $(SRC) -o $(TARGET)

run: $(TARGET)
	./$(TARGET) $(ITER)

lint:
	$(CXX) -std=c++20 -Wall -Wextra -pedantic -Werror -fsyntax-only $(SRC)
	clang-format --dry-run --Werror $(SRC)

clean:
	rm -f $(TARGET)

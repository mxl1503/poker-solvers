JSON_HDR := json.hpp
JSON_URL := https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp

.PHONY: deps clean

deps: $(JSON_HDR)

$(JSON_HDR):
	curl -sL -o $(JSON_HDR) $(JSON_URL)

clean:
	rm -f $(JSON_HDR)

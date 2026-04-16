PKG_VERSION = $(shell bun -e "console.log(require('./package.json').version)")
COMMIT_HASH = $(shell git rev-parse --short HEAD)
VERSION ?= $(PKG_VERSION) ($(COMMIT_HASH))
TARGET ?=

DIST_DIR = dist
BINARY = httpew
BIN_PATH = $(DIST_DIR)/$(BINARY)

.PHONY: deps build install dev

deps:
	bun install

build:
	bun build src/index.jsx --compile $(TARGET) --outfile $(BIN_PATH) --define 'BUILD_VERSION="$(VERSION)"'

install: build
	@mkdir -p ~/.local/bin
	@rm -f ~/.local/bin/$(BINARY)
	@cp $(BIN_PATH) ~/.local/bin/

dev:
	# make dev
	# make dev file=example/dummyjson-jetbrains.http
	bun run src/index.jsx $(file)

# Seagulla — developer entry points.
#
# Run `make bootstrap` after cloning: Seagulla.xcodeproj is generated, not committed.

SWIFT_SOURCES := Sources Tests Seagulla Gallery
XCODEPROJ := Seagulla.xcodeproj

.DEFAULT_GOAL := help
.PHONY: help bootstrap build test lint format layering preflight xcode app gallery cli ci clean tools

help: ## Show available targets
	@grep -E '^[a-z-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

tools: ## Verify required tooling is installed
	@command -v swift >/dev/null || { echo "error: swift not found (install Xcode 16+)"; exit 1; }
	@command -v xcodegen >/dev/null || { echo "error: xcodegen not found (brew install xcodegen)"; exit 1; }
	@command -v swiftlint >/dev/null || { echo "error: swiftlint not found (brew install swiftlint)"; exit 1; }
	@echo "toolchain ok"

bootstrap: tools xcode ## Prepare a fresh checkout for development
	@echo "bootstrap complete — open $(XCODEPROJ)"

xcode: ## Generate the Xcode project from project.yml
	xcodegen generate --spec project.yml

build: ## Build all package modules
	swift build --configuration debug

test: ## Run Swift and Python test suites
	swift test --configuration debug
	python3 Scripts/test_check_layering.py
	python3 Scripts/test_check_formatting.py

layering: ## Validate the module graph against Scripts/architecture.json
	python3 Scripts/check_layering.py

preflight: ## Toolchain-free checks: module graph and formatting
	python3 Scripts/check_layering.py
	python3 Scripts/check_formatting.py

lint: preflight ## Run all static checks
	swiftlint lint --config .swiftlint.yml --quiet
	xcrun swift-format lint --recursive --strict --configuration .swift-format $(SWIFT_SOURCES)

format: ## Apply swift-format in place
	xcrun swift-format format --recursive --in-place --configuration .swift-format $(SWIFT_SOURCES)

app: xcode ## Build the Seagulla app
	xcodebuild -project $(XCODEPROJ) -scheme Seagulla -configuration Debug CODE_SIGNING_ALLOWED=NO build

gallery: xcode ## Build the design-system gallery
	xcodebuild -project $(XCODEPROJ) -scheme Gallery -configuration Debug CODE_SIGNING_ALLOWED=NO build

cli: ## Run seagulla-cli
	swift run seagulla-cli

ci: preflight test build lint app gallery ## Everything CI runs, in CI order

clean: ## Remove build artifacts
	swift package clean
	rm -rf .build DerivedData $(XCODEPROJ)

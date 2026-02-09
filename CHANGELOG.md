# 1.0.0 (2026-02-09)


### Bug Fixes

* Add explicit px units to ProgressBar height ([8d5ae2e](https://github.com/AnthusAI/videoml-toolchain/commit/8d5ae2ed78af9b06d41a794f2e14c7d5908fe433))
* add xmldom dependency for amplify build ([afb5951](https://github.com/AnthusAI/videoml-toolchain/commit/afb59511039ae4704642076e96615643132244ec))
* **amplify:** add backend CLI to root devDependencies ([678b3ae](https://github.com/AnthusAI/videoml-toolchain/commit/678b3ae5fcf5f3f80cb65f032db16c03c52dec6c))
* **amplify:** add backend package and use npm exec ([77de6de](https://github.com/AnthusAI/videoml-toolchain/commit/77de6de82b7a8ec20129fda0d3273801596252bd))
* **amplify:** move backend packages to dependencies ([588809d](https://github.com/AnthusAI/videoml-toolchain/commit/588809d899c2be9ee82776c61e06438d38466930))
* **build:** resolve TypeScript errors for Amplify frontend build ([cec4476](https://github.com/AnthusAI/videoml-toolchain/commit/cec447621ec2ca82e9536ec05f7ace59a5828d91))
* relax xml patch node typing for amplify ([550c91b](https://github.com/AnthusAI/videoml-toolchain/commit/550c91b35ee964b4eca8be0ea5a1edf231416d5c))
* resolve dsl typing and script outputs ([8fb6f2e](https://github.com/AnthusAI/videoml-toolchain/commit/8fb6f2ed267c693307714e0f549be175d8228cb9))
* update DEFAULT_DSL to use correct defineVideo API and dry-run provider ([954cde3](https://github.com/AnthusAI/videoml-toolchain/commit/954cde3a900b4ad45932be9e62febc3dedce64db))


### Features

* Add component system foundation (blank slate architecture) ([b49714a](https://github.com/AnthusAI/videoml-toolchain/commit/b49714aab6e7728bc4c270d207f60e7e0110ebe0))
* add job retry logic with exponential backoff ([1959470](https://github.com/AnthusAI/videoml-toolchain/commit/19594706eec178bab4277b25327b52450277d2f1))
* add view tracking with localStorage debouncing and view count display ([78ebda7](https://github.com/AnthusAI/videoml-toolchain/commit/78ebda7f4209d48760e2dccfbd5db5ad717f3db2))
* Add visual content control to DSL via markup system ([0a06feb](https://github.com/AnthusAI/videoml-toolchain/commit/0a06feb7bc5e7a8e6d8fb40881512bde66463abf))
* **auth:** add Amplify client library integration ([e7c2062](https://github.com/AnthusAI/videoml-toolchain/commit/e7c2062a5e0e9958f7e5b5f79790f1b790aba892))
* complete studio implementation (phases 9-10) ([5ea0870](https://github.com/AnthusAI/videoml-toolchain/commit/5ea08703b7e7bd0fac586925605fca8b548cff27))
* expand renderer helpers and BDD coverage ([ead6041](https://github.com/AnthusAI/videoml-toolchain/commit/ead60416fab37b59b32d5b46fa417cc21eef435f))
* extract render job processing to worker-lib.ts ([2c5b1db](https://github.com/AnthusAI/videoml-toolchain/commit/2c5b1db73d654f5c58cf11b43bde6fed501488e3))
* implement access control with password protection and org-only access ([83f6d8e](https://github.com/AnthusAI/videoml-toolchain/commit/83f6d8e247ea007aa99aee7656b862abc15f51ea))
* Implement cascading styles system with layers ([0d07860](https://github.com/AnthusAI/videoml-toolchain/commit/0d078604108e86ced23a16259534e0d59980860f))
* implement universal secrets management with config loader ([e7f24fe](https://github.com/AnthusAI/videoml-toolchain/commit/e7f24fe64a87861153835548d01e193f2319fb70))
* initial commit with semantic-release setup ([dd1e056](https://github.com/AnthusAI/videoml-toolchain/commit/dd1e056ebc5f413a8376b3e0ee6a3268d03f4cc6))
* live VOM XML pipeline and docs ([7ddca80](https://github.com/AnthusAI/videoml-toolchain/commit/7ddca8038c7963570225f59e7ecf61a0fd982497))
* Overhaul UI with flat design and add settings dialog ([741ffa4](https://github.com/AnthusAI/videoml-toolchain/commit/741ffa436a4f6c5513ca1d6ac6396460427189ad))
* Refactor worker to testable library with BDD tests ([0bed3ee](https://github.com/AnthusAI/videoml-toolchain/commit/0bed3ee72db0aca5b31046aaebd862aec3ffa439))
* Remove StoryboardRenderer and use ComposableRenderer exclusively ([a876017](https://github.com/AnthusAI/videoml-toolchain/commit/a876017867b8cc06bcdf3adb12d3fabe28ef4fad))
* **renderer:** add storyboard PNG renderer and toolchain validation ([92eda81](https://github.com/AnthusAI/videoml-toolchain/commit/92eda81e2ea158b2756572e2d87398ed409efe37))
* **renderer:** enhance frame callbacks and encode pipeline ([71c6960](https://github.com/AnthusAI/videoml-toolchain/commit/71c6960986701e66c71dfa6d6e68489ae3496e59))
* setup semantic-release ([bb7436c](https://github.com/AnthusAI/videoml-toolchain/commit/bb7436cdb19e3d430bf8af97dc045d59ab62a3f1))


### BREAKING CHANGES

* Worker logic extracted to worker-lib.ts for testability

- Extract testable functions from worker-cloud.ts to worker-lib.ts
- Add dependency injection for GraphQL and Storage clients
- Implement claimNextJob, processGenerationJob, updateJobStatus
- Add emitJobEvent for progress tracking
- Update Lambda handler to use new modular functions
- Create comprehensive BDD feature file (worker_generation.feature)
- Write Cucumber step definitions with mock clients
- Test job claiming, processing, error handling, progress tracking
- Use OpenAI TTS as default provider (cheap for testing)

BDD scenarios cover:
- Job claiming with optimistic locking
- Valid and invalid DSL processing
- TTS API integration
- Artifact upload to S3
- GenerationRun record creation
- Usage event tracking
- Error handling and status updates
- Progress event emission
- Temporary file cleanup

Next: Run BDD tests to verify coverage and fix any failures

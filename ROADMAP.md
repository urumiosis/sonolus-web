# Browser Sonolus implementation plan

This project targets a real browser implementation of Sonolus play mode, with Next SEKAI as the first engine target.

## Milestones

1. **Server/resource layer** — discover server items and fetch JSON/SRL resources. *(started)*
2. **Play-data model** — parse Engine Play Data, archetypes, nodes, buckets and resource declarations. *(started)*
3. **Runtime state** — frame clock, entity lifecycle, input state, score/life/combo. *(started)*
4. **Node/callback VM** — execute the engine callbacks described by Play Data. This is the core compatibility layer.
5. **Renderer** — implement Sonolus sprite/quad/mesh primitives over Canvas/WebGL/WebGPU.
6. **Audio/effects** — decode and schedule BGM/SFX with Web Audio using the engine's timing model.
7. **Level data** — load level entities and engine resources from a real Next SEKAI server.
8. **Judgment/input** — implement touch/pointer input and bucket judgment semantics.
9. **Next SEKAI compatibility** — validate against the current Next SEKAI engine and charts.
10. **Packaging** — static deployment that works as a normal Chrome website.

## Important constraint

A browser client cannot simply execute the Python source from `sonolus-next-sekai-engine`. The Sonolus build process turns engine source into Sonolus engine resources/callback programs. The browser runtime therefore needs to execute the generated engine representation according to the Sonolus engine specification.

The implementation should follow the public Sonolus specification rather than depend on private/native Sonolus internals.

## Scope

Initial target is play mode only. Watch mode, tutorial mode, editor functionality, multiplayer and full native-client feature parity are out of scope until basic Next SEKAI gameplay works.

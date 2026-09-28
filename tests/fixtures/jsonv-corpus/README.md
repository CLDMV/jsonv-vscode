# jsonv valid-fixture corpus

Every valid (non-`violations/`) `.jsonv` fixture from [`CLDMV/jsonv`](https://github.com/CLDMV/jsonv) `tests/fixtures/`, copied verbatim with its `<year>/...` path preserved, at jsonv commit [`5bfa55bc9dbcd188d991db38a6565e1b3d853760`](https://github.com/CLDMV/jsonv/commit/5bfa55bc9dbcd188d991db38a6565e1b3d853760) (v1.1.0). Each file parses with `@cldmv/jsonv` in the year mode named by its top-level directory. The published npm package does not ship its fixtures, so they are vendored here.

`tests/grammar-corpus.test.vitest.mjs` tokenizes every file with the TextMate grammar and asserts that no token carries an `invalid.illegal.*` scope. When refreshing the corpus, copy the fixtures again from a newer jsonv commit, leave out the `violations/` directories, and update the commit above.

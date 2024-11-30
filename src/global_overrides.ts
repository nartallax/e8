const module = {}
// this exists because `pako` package is too smart
// it tries to dynamically import `worker_threads` module when in node, which results in it using `module` global variable in its code
// however, esbuild panics in this case because there is no such global variable in es module file
// and the solution I came up with is to create such global variable (see build script - this file is injected in global scope)
// (this sucks, but I don't want to abandon esm format, so it's better than nothing)
export {module}
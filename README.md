# unistar-async-script-loader

Asynchronous script loader to dynamicly load and destory arbitrary scripts.

## Getting Started
Not yet in the npm.
Just copy src/index.ts and use.

## Usage
```javascript
AsyncScriptLoader.script('./script/a.js', () => console.log('destroy a'))
                 .script('./script/b.js').wait()
                 .script('./script/c.js')
                 .func(() => console.log('I"m one-off function'))
                 .run();

AsyncScriptLoader.destory('./script/a.js')
                 .run();
```
The scripts will be appended to document.body.


## API
```typescript
/**
 * the API class
 * 
 * the functions are divided into 2 modes:
 * script(), func(), wait() and destory() run in record mode.
 *      they will simply push a task in the running queue of the LoadingChain,
 *      and they does not perform the actural loading and destory task.
 * 
 * run() runs in execute mode.
 *      it will asynchronously execute the tasks in the running queue.
 *      tasks in the queue are parallel executed, unless a wait() call is specified in the record mode.
 *      no more API invocations to the LoadingChain can be performed after the run() method. 
 */
class AsyncScriptLoader {

    /**
     * record mode.
     *      record a script to be load.
     * 
     * @param {string} script  - the script to load. 
     *                                      string parameter indicates the url of the script, and, when loaded, will append a <script> tag to document.body.
     * 
     * @param {function} destroyCallback  - (optional) the clean up method called by destory when the script is destroyed.
     *                                                 undo the side effect of loading and executing the script. 
     */
    public script(script, destroyCallback?) {
        return new LoadingChain().script(script, destroyCallback);
    };

    /**
     * record mode.
     *      record a script to be load.
     * 
     * @param {function} func  - a one-off function invocation. 
     */
    public func(func) {
        return new LoadingChain().func(func);
    };

    /**
     * record mode.
     *      destory a loaded script.
     * 
     * @param {string|function} script  - the script to destory. 
     *                                      string parameter indicates the url of the script, and, when destoryed, will remove the <script> tag in document.body.
     *                                      function parameter indicates we will call the destroyCallback of a one-off function invocation. 
     */
    public destroy(script) {
        return new LoadingChain().destroy(script);
    };

    /**
     * execute mode.
     *      it will asynchronously execute all the task recorded.
     *      tasks in the queue are parallel executed, unless a wait() call is specified in the record mode.
     *      no more API invocations to the LoadingChain can be performed after the run() method.
     * 
     *      loaded scripts will be cached in a global registry.
     *      duplicate scripts will only be loaded once, and loaded scripts can be destroyed.
     */
    public run() {
        new LoadingChain().run();
    };
};
```

## LICENSE
MIT.

## Why I wrote this
Maybe sometimes you have to write a page which dynamicly load and execute some JS files. Which files are executed depends on user choice (geolocation, sales product, etc.).
But dependency resolving in webpack is static, so when you write 'require' in your code, webpack will resolve it in compile time. This is not we want.

This code is inspired by LABjs. Since LABjs does not support commonjs and is hard to intergrate into webpack compilation, I rewrite the core code in typescript.

Moreover, SPAs are more and more popular these days, we'll have to do some cleanup when we 'switch pages' in SPA framework. So I added a 'destroyCallback' to 'destroy' the side effect of loading the script, you can do some cleanup in this callback.


## Welcome PR :)
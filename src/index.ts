/**
 * Cache class for caching script Object
 */
class ScriptCache {

    private cache: any;

    public constructor() {
        this.cache = {};
    }

    public put(scriptObj) {
        this.cache[scriptObj.cacheKey] = scriptObj;
    }

    public remove(cacheKey) {
        delete this.cache[cacheKey];
    }

    public contains(cacheKey) {
        return !!this.cache[cacheKey];
    }

    public get(cacheKey) {
        return this.cache[cacheKey];
    }
};

/**
 * since we append new script tags to document.body,
 * there will only be one global script cache object.
 */
const GlobalScriptCache = new ScriptCache();

/**
 * Main loading logic goes here
 * Adopt a chaining API like JQuery
 * to simplify the usage.
 */
class LoadingChain {

    private queue: any;

    public constructor() {

        /**
         * the loading task queue, the data structure is listed below
         * 
         *      queue = [ScriptGroup1 , ScriptGroup2, ...] - ScriptGroups are separated by wait() command.
         * 
         *      ScriptGroup = [ScriptObject1, ScriptObject2, ...] - ScriptObjects in the same group are parallel loaded.
         * 
         *      ScriptObject = {
         *          type:    'url' - a external script     
         *                   'function' - a one off function call        
         *                   'destroy' - a destroy task
         *          cacheKey:    the key in the global cache
         *                          type === 'url'  -  the url string
         *                          type === 'function'  - the function.toString()
         *                          type === 'destroy'  - undefined
         *          url:      type === 'url'  - the url string
         *          fun:      type === 'function'  - the function
         *          destroyCallback:  type in 'url', 'function' - the destory callback specified
         *      }
         */
        this.queue = [];
    }

    private _loadGroup(group) {
        let promises = [];
        // async load script objects
        for (let scriptObj of group) {
            promises.push(this._loadScript(scriptObj));
        }

        // wait until all the objects are loaded
        return Promise.all(promises);
    }

    private _loadScript(scriptObj) {
        return new Promise((resolve, reject) => {
            // load external script
            if (scriptObj.type === 'url') {
                const ele = document.createElement('script');
                ele.async = true;
                ele.src = scriptObj.url;

                ele.onload = () => {
                    // save the <script> element for destory
                    scriptObj.element = ele;
                    // put in cache when loaded.
                    GlobalScriptCache.put(scriptObj);
                    resolve();
                }

                ele.onerror = () => {
                    reject();
                }

                // append a script tag
                document.body.appendChild(ele);
            }
            // load one-off function
            else if (scriptObj.type === 'function') {
                // call the one-off function
                scriptObj.fun.call(null);
                resolve();
            }
            // load destroy function
            else {
                // check in cache
                if (GlobalScriptCache.contains(scriptObj.cacheKey)) {

                    const scriptObj2Destroy = GlobalScriptCache.get(scriptObj.cacheKey);

                    // remove <script> tag from document.body
                    if (!!scriptObj2Destroy.element) {
                        document.body.removeChild(scriptObj2Destroy.element);
                    }

                    // call the destory call back
                    if (typeof (scriptObj2Destroy.destroyCallback) === 'function') {
                        scriptObj2Destroy.destroyCallback.call(null);
                    }

                    // remove from cache
                    GlobalScriptCache.remove(scriptObj2Destroy.cacheKey);
                }
                resolve();
            }
        });
    }

    private _buildScriptObjCacheKey(script) {
        if (typeof (script) === 'string') {
            return script;
        } else if (typeof (script) === 'function') {
            return script.toString();
        }
    }

    private _buildScriptObj(script, destroyCallback?) {
        const scriptObj: any = {};
        scriptObj.cacheKey = script;
        scriptObj.type = 'url';
        scriptObj.url = script;

        if (typeof (destroyCallback) === 'function') {
            scriptObj.destroyCallback = destroyCallback;
        }
        return scriptObj;
    }

    private _buildFuncObj(func) {
        const scriptObj: any = {};
        scriptObj.cacheKey = func.toString();
        scriptObj.type = 'function';
        scriptObj.fun = func;
        return scriptObj;
    }

    private _pushScript(script, destroyCallback?) {
        if (this.queue.length == 0) {
            this._pushGroup();
        }

        const scriptObj = this._buildScriptObj(script, destroyCallback);

        // script loadings are cached
        if (!GlobalScriptCache.contains(scriptObj.cacheKey)) {
            this.queue[this.queue.length - 1].push(scriptObj);
        }

    }

    private _pushFunc(func) {
        if (this.queue.length == 0) {
            this._pushGroup();
        }

        const scriptObj = this._buildFuncObj(func);

        // function invokations are not cached
        this.queue[this.queue.length - 1].push(scriptObj);
    }

    private _pushDestroy(script) {
        const destroyObj: any = {};
        destroyObj.cacheKey = this._buildScriptObjCacheKey(script);
        destroyObj.type = 'destroy';
        this.queue[this.queue.length - 1].push(destroyObj);
    }

    private _pushGroup() {
        this.queue.push([]);
    }

    /**
     * record a script loading task
     */
    public script(script, destroyCallback?) {
        this._pushScript(script, destroyCallback);
        return this;
    }

    /**
     * record a function execution task
     */
    public func(func) {
        this._pushFunc(func);
        return this;
    }

    /**
     * record a wait task
     */
    public wait() {
        this._pushGroup();
        return this;
    }

    /**
     * record a script destorying task
     */
    public destroy(script) {
        this._pushDestroy(script);
        return this;
    }

    /**
     * asynchronously execute all the recorded tasks
     */
    public run() {

        let chainedPromoise = new Promise((resolve, reject) => resolve());

        // iterate thought the groups in queue
        for (let group of this.queue) {
            chainedPromoise = chainedPromoise.then(() => this._loadGroup(group));
        }
        // append catch clouse
        chainedPromoise.catch(e => { console.trace(e) });

        // clear the queue
        this.queue = null;
    }
};

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
     *      record a wait command.
     * 
     * scripts will be parallel loaded in the execute mode,
     * unless they are told by a wait command to wait for all the loading script to finish, then they will go to load the remaining scripts.
     * 
     */
    public wait() {
        return new LoadingChain().wait();
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

/**
 * Again since we append new script tags to document.body,
 * there will only be one global AsyncScriptLoader object.
 */
const GlobalAsyncScriptLoader = new AsyncScriptLoader();

(<any>window).AsyncScriptLoader = GlobalAsyncScriptLoader;

/**
 * Export the global Object
 */
export {
    GlobalAsyncScriptLoader as AsyncScriptLoader
}
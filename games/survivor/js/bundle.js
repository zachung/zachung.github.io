(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],2:[function(require,module,exports){

var Keyboard = require('./lib/keyboard');
var Locale   = require('./lib/locale');
var KeyCombo = require('./lib/key-combo');

var keyboard = new Keyboard();

keyboard.setLocale('us', require('./locales/us'));

exports          = module.exports = keyboard;
exports.Keyboard = Keyboard;
exports.Locale   = Locale;
exports.KeyCombo = KeyCombo;

},{"./lib/key-combo":3,"./lib/keyboard":4,"./lib/locale":5,"./locales/us":6}],3:[function(require,module,exports){

function KeyCombo(keyComboStr) {
  this.sourceStr = keyComboStr;
  this.subCombos = KeyCombo.parseComboStr(keyComboStr);
  this.keyNames  = this.subCombos.reduce(function(memo, nextSubCombo) {
    return memo.concat(nextSubCombo);
  }, []);
}

// TODO: Add support for key combo sequences
KeyCombo.sequenceDeliminator = '>>';
KeyCombo.comboDeliminator    = '>';
KeyCombo.keyDeliminator      = '+';

KeyCombo.parseComboStr = function(keyComboStr) {
  var subComboStrs = KeyCombo._splitStr(keyComboStr, KeyCombo.comboDeliminator);
  var combo        = [];

  for (var i = 0 ; i < subComboStrs.length; i += 1) {
    combo.push(KeyCombo._splitStr(subComboStrs[i], KeyCombo.keyDeliminator));
  }
  return combo;
};

KeyCombo.prototype.check = function(pressedKeyNames) {
  var startingKeyNameIndex = 0;
  for (var i = 0; i < this.subCombos.length; i += 1) {
    startingKeyNameIndex = this._checkSubCombo(
      this.subCombos[i],
      startingKeyNameIndex,
      pressedKeyNames
    );
    if (startingKeyNameIndex === -1) { return false; }
  }
  return true;
};

KeyCombo.prototype.isEqual = function(otherKeyCombo) {
  if (
    !otherKeyCombo ||
    typeof otherKeyCombo !== 'string' &&
    typeof otherKeyCombo !== 'object'
  ) { return false; }

  if (typeof otherKeyCombo === 'string') {
    otherKeyCombo = new KeyCombo(otherKeyCombo);
  }

  if (this.subCombos.length !== otherKeyCombo.subCombos.length) {
    return false;
  }
  for (var i = 0; i < this.subCombos.length; i += 1) {
    if (this.subCombos[i].length !== otherKeyCombo.subCombos[i].length) {
      return false;
    }
  }

  for (var i = 0; i < this.subCombos.length; i += 1) {
    var subCombo      = this.subCombos[i];
    var otherSubCombo = otherKeyCombo.subCombos[i].slice(0);

    for (var j = 0; j < subCombo.length; j += 1) {
      var keyName = subCombo[j];
      var index   = otherSubCombo.indexOf(keyName);

      if (index > -1) {
        otherSubCombo.splice(index, 1);
      }
    }
    if (otherSubCombo.length !== 0) {
      return false;
    }
  }

  return true;
};

KeyCombo._splitStr = function(str, deliminator) {
  var s  = str;
  var d  = deliminator;
  var c  = '';
  var ca = [];

  for (var ci = 0; ci < s.length; ci += 1) {
    if (ci > 0 && s[ci] === d && s[ci - 1] !== '\\') {
      ca.push(c.trim());
      c = '';
      ci += 1;
    }
    c += s[ci];
  }
  if (c) { ca.push(c.trim()); }

  return ca;
};

KeyCombo.prototype._checkSubCombo = function(subCombo, startingKeyNameIndex, pressedKeyNames) {
  subCombo = subCombo.slice(0);
  pressedKeyNames = pressedKeyNames.slice(startingKeyNameIndex);

  var endIndex = startingKeyNameIndex;
  for (var i = 0; i < subCombo.length; i += 1) {

    var keyName = subCombo[i];
    if (keyName[0] === '\\') {
      var escapedKeyName = keyName.slice(1);
      if (
        escapedKeyName === KeyCombo.comboDeliminator ||
        escapedKeyName === KeyCombo.keyDeliminator
      ) {
        keyName = escapedKeyName;
      }
    }

    var index = pressedKeyNames.indexOf(keyName);
    if (index > -1) {
      subCombo.splice(i, 1);
      i -= 1;
      if (index > endIndex) {
        endIndex = index;
      }
      if (subCombo.length === 0) {
        return endIndex;
      }
    }
  }
  return -1;
};


module.exports = KeyCombo;

},{}],4:[function(require,module,exports){
(function (global){

var Locale = require('./locale');
var KeyCombo = require('./key-combo');


function Keyboard(targetWindow, targetElement, platform, userAgent) {
  this._locale               = null;
  this._currentContext       = null;
  this._contexts             = {};
  this._listeners            = [];
  this._appliedListeners     = [];
  this._locales              = {};
  this._targetElement        = null;
  this._targetWindow         = null;
  this._targetPlatform       = '';
  this._targetUserAgent      = '';
  this._isModernBrowser      = false;
  this._targetKeyDownBinding = null;
  this._targetKeyUpBinding   = null;
  this._targetResetBinding   = null;
  this._paused               = false;
  this._callerHandler        = null;

  this.setContext('global');
  this.watch(targetWindow, targetElement, platform, userAgent);
}

Keyboard.prototype.setLocale = function(localeName, localeBuilder) {
  var locale = null;
  if (typeof localeName === 'string') {

    if (localeBuilder) {
      locale = new Locale(localeName);
      localeBuilder(locale, this._targetPlatform, this._targetUserAgent);
    } else {
      locale = this._locales[localeName] || null;
    }
  } else {
    locale     = localeName;
    localeName = locale._localeName;
  }

  this._locale              = locale;
  this._locales[localeName] = locale;
  if (locale) {
    this._locale.pressedKeys = locale.pressedKeys;
  }
};

Keyboard.prototype.getLocale = function(localName) {
  localName || (localName = this._locale.localeName);
  return this._locales[localName] || null;
};

Keyboard.prototype.bind = function(keyComboStr, pressHandler, releaseHandler, preventRepeatByDefault) {
  if (keyComboStr === null || typeof keyComboStr === 'function') {
    preventRepeatByDefault = releaseHandler;
    releaseHandler         = pressHandler;
    pressHandler           = keyComboStr;
    keyComboStr            = null;
  }

  if (
    keyComboStr &&
    typeof keyComboStr === 'object' &&
    typeof keyComboStr.length === 'number'
  ) {
    for (var i = 0; i < keyComboStr.length; i += 1) {
      this.bind(keyComboStr[i], pressHandler, releaseHandler);
    }
    return;
  }

  this._listeners.push({
    keyCombo               : keyComboStr ? new KeyCombo(keyComboStr) : null,
    pressHandler           : pressHandler           || null,
    releaseHandler         : releaseHandler         || null,
    preventRepeat          : preventRepeatByDefault || false,
    preventRepeatByDefault : preventRepeatByDefault || false
  });
};
Keyboard.prototype.addListener = Keyboard.prototype.bind;
Keyboard.prototype.on          = Keyboard.prototype.bind;

Keyboard.prototype.unbind = function(keyComboStr, pressHandler, releaseHandler) {
  if (keyComboStr === null || typeof keyComboStr === 'function') {
    releaseHandler = pressHandler;
    pressHandler   = keyComboStr;
    keyComboStr = null;
  }

  if (
    keyComboStr &&
    typeof keyComboStr === 'object' &&
    typeof keyComboStr.length === 'number'
  ) {
    for (var i = 0; i < keyComboStr.length; i += 1) {
      this.unbind(keyComboStr[i], pressHandler, releaseHandler);
    }
    return;
  }

  for (var i = 0; i < this._listeners.length; i += 1) {
    var listener = this._listeners[i];

    var comboMatches          = !keyComboStr && !listener.keyCombo ||
                                listener.keyCombo && listener.keyCombo.isEqual(keyComboStr);
    var pressHandlerMatches   = !pressHandler && !releaseHandler ||
                                !pressHandler && !listener.pressHandler ||
                                pressHandler === listener.pressHandler;
    var releaseHandlerMatches = !pressHandler && !releaseHandler ||
                                !releaseHandler && !listener.releaseHandler ||
                                releaseHandler === listener.releaseHandler;

    if (comboMatches && pressHandlerMatches && releaseHandlerMatches) {
      this._listeners.splice(i, 1);
      i -= 1;
    }
  }
};
Keyboard.prototype.removeListener = Keyboard.prototype.unbind;
Keyboard.prototype.off            = Keyboard.prototype.unbind;

Keyboard.prototype.setContext = function(contextName) {
  if(this._locale) { this.releaseAllKeys(); }

  if (!this._contexts[contextName]) {
    this._contexts[contextName] = [];
  }
  this._listeners      = this._contexts[contextName];
  this._currentContext = contextName;
};

Keyboard.prototype.getContext = function() {
  return this._currentContext;
};

Keyboard.prototype.withContext = function(contextName, callback) {
  var previousContextName = this.getContext();
  this.setContext(contextName);

  callback();

  this.setContext(previousContextName);
};

Keyboard.prototype.watch = function(targetWindow, targetElement, targetPlatform, targetUserAgent) {
  var _this = this;

  this.stop();

  if (!targetWindow) {
    if (!global.addEventListener && !global.attachEvent) {
      throw new Error('Cannot find global functions addEventListener or attachEvent.');
    }
    targetWindow = global;
  }

  if (typeof targetWindow.nodeType === 'number') {
    targetUserAgent = targetPlatform;
    targetPlatform  = targetElement;
    targetElement   = targetWindow;
    targetWindow    = global;
  }

  if (!targetWindow.addEventListener && !targetWindow.attachEvent) {
    throw new Error('Cannot find addEventListener or attachEvent methods on targetWindow.');
  }

  this._isModernBrowser = !!targetWindow.addEventListener;

  var userAgent = targetWindow.navigator && targetWindow.navigator.userAgent || '';
  var platform  = targetWindow.navigator && targetWindow.navigator.platform  || '';

  targetElement   && targetElement   !== null || (targetElement   = targetWindow.document);
  targetPlatform  && targetPlatform  !== null || (targetPlatform  = platform);
  targetUserAgent && targetUserAgent !== null || (targetUserAgent = userAgent);

  this._targetKeyDownBinding = function(event) {
    _this.pressKey(event.keyCode, event);
    _this._handleCommandBug(event, platform);
  };
  this._targetKeyUpBinding = function(event) {
    _this.releaseKey(event.keyCode, event);
  };
  this._targetResetBinding = function(event) {
    _this.releaseAllKeys(event)
  };

  this._bindEvent(targetElement, 'keydown', this._targetKeyDownBinding);
  this._bindEvent(targetElement, 'keyup',   this._targetKeyUpBinding);
  this._bindEvent(targetWindow,  'focus',   this._targetResetBinding);
  this._bindEvent(targetWindow,  'blur',    this._targetResetBinding);

  this._targetElement   = targetElement;
  this._targetWindow    = targetWindow;
  this._targetPlatform  = targetPlatform;
  this._targetUserAgent = targetUserAgent;
};

Keyboard.prototype.stop = function() {
  var _this = this;

  if (!this._targetElement || !this._targetWindow) { return; }

  this._unbindEvent(this._targetElement, 'keydown', this._targetKeyDownBinding);
  this._unbindEvent(this._targetElement, 'keyup',   this._targetKeyUpBinding);
  this._unbindEvent(this._targetWindow,  'focus',   this._targetResetBinding);
  this._unbindEvent(this._targetWindow,  'blur',    this._targetResetBinding);

  this._targetWindow  = null;
  this._targetElement = null;
};

Keyboard.prototype.pressKey = function(keyCode, event) {
  if (this._paused) { return; }
  if (!this._locale) { throw new Error('Locale not set'); }

  this._locale.pressKey(keyCode);
  this._applyBindings(event);
};

Keyboard.prototype.releaseKey = function(keyCode, event) {
  if (this._paused) { return; }
  if (!this._locale) { throw new Error('Locale not set'); }

  this._locale.releaseKey(keyCode);
  this._clearBindings(event);
};

Keyboard.prototype.releaseAllKeys = function(event) {
  if (this._paused) { return; }
  if (!this._locale) { throw new Error('Locale not set'); }

  this._locale.pressedKeys.length = 0;
  this._clearBindings(event);
};

Keyboard.prototype.pause = function() {
  if (this._paused) { return; }
  if (this._locale) { this.releaseAllKeys(); }
  this._paused = true;
};

Keyboard.prototype.resume = function() {
  this._paused = false;
};

Keyboard.prototype.reset = function() {
  this.releaseAllKeys();
  this._listeners.length = 0;
};

Keyboard.prototype._bindEvent = function(targetElement, eventName, handler) {
  return this._isModernBrowser ?
    targetElement.addEventListener(eventName, handler, false) :
    targetElement.attachEvent('on' + eventName, handler);
};

Keyboard.prototype._unbindEvent = function(targetElement, eventName, handler) {
  return this._isModernBrowser ?
    targetElement.removeEventListener(eventName, handler, false) :
    targetElement.detachEvent('on' + eventName, handler);
};

Keyboard.prototype._getGroupedListeners = function() {
  var listenerGroups   = [];
  var listenerGroupMap = [];

  var listeners = this._listeners;
  if (this._currentContext !== 'global') {
    listeners = [].concat(listeners, this._contexts.global);
  }

  listeners.sort(function(a, b) {
    return (b.keyCombo ? b.keyCombo.keyNames.length : 0) - (a.keyCombo ? a.keyCombo.keyNames.length : 0);
  }).forEach(function(l) {
    var mapIndex = -1;
    for (var i = 0; i < listenerGroupMap.length; i += 1) {
      if (listenerGroupMap[i] === null && l.keyCombo === null ||
          listenerGroupMap[i] !== null && listenerGroupMap[i].isEqual(l.keyCombo)) {
        mapIndex = i;
      }
    }
    if (mapIndex === -1) {
      mapIndex = listenerGroupMap.length;
      listenerGroupMap.push(l.keyCombo);
    }
    if (!listenerGroups[mapIndex]) {
      listenerGroups[mapIndex] = [];
    }
    listenerGroups[mapIndex].push(l);
  });
  return listenerGroups;
};

Keyboard.prototype._applyBindings = function(event) {
  var preventRepeat = false;

  event || (event = {});
  event.preventRepeat = function() { preventRepeat = true; };
  event.pressedKeys   = this._locale.pressedKeys.slice(0);

  var pressedKeys    = this._locale.pressedKeys.slice(0);
  var listenerGroups = this._getGroupedListeners();


  for (var i = 0; i < listenerGroups.length; i += 1) {
    var listeners = listenerGroups[i];
    var keyCombo  = listeners[0].keyCombo;

    if (keyCombo === null || keyCombo.check(pressedKeys)) {
      for (var j = 0; j < listeners.length; j += 1) {
        var listener = listeners[j];

        if (keyCombo === null) {
          listener = {
            keyCombo               : new KeyCombo(pressedKeys.join('+')),
            pressHandler           : listener.pressHandler,
            releaseHandler         : listener.releaseHandler,
            preventRepeat          : listener.preventRepeat,
            preventRepeatByDefault : listener.preventRepeatByDefault
          };
        }

        if (listener.pressHandler && !listener.preventRepeat) {
          listener.pressHandler.call(this, event);
          if (preventRepeat) {
            listener.preventRepeat = preventRepeat;
            preventRepeat          = false;
          }
        }

        if (listener.releaseHandler && this._appliedListeners.indexOf(listener) === -1) {
          this._appliedListeners.push(listener);
        }
      }

      if (keyCombo) {
        for (var j = 0; j < keyCombo.keyNames.length; j += 1) {
          var index = pressedKeys.indexOf(keyCombo.keyNames[j]);
          if (index !== -1) {
            pressedKeys.splice(index, 1);
            j -= 1;
          }
        }
      }
    }
  }
};

Keyboard.prototype._clearBindings = function(event) {
  event || (event = {});

  for (var i = 0; i < this._appliedListeners.length; i += 1) {
    var listener = this._appliedListeners[i];
    var keyCombo = listener.keyCombo;
    if (keyCombo === null || !keyCombo.check(this._locale.pressedKeys)) {
      if (this._callerHandler !== listener.releaseHandler) {
        var oldCaller = this._callerHandler;
        this._callerHandler = listener.releaseHandler;
        listener.preventRepeat = listener.preventRepeatByDefault;
        listener.releaseHandler.call(this, event);
        this._callerHandler = oldCaller;
      }
      this._appliedListeners.splice(i, 1);
      i -= 1;
    }
  }
};

Keyboard.prototype._handleCommandBug = function(event, platform) {
  // On Mac when the command key is kept pressed, keyup is not triggered for any other key.
  // In this case force a keyup for non-modifier keys directly after the keypress.
  var modifierKeys = ["shift", "ctrl", "alt", "capslock", "tab", "command"];
  if (platform.match("Mac") && this._locale.pressedKeys.includes("command") &&
      !modifierKeys.includes(this._locale.getKeyNames(event.keyCode)[0])) {
    this._targetKeyUpBinding(event);
  }
};

module.exports = Keyboard;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./key-combo":3,"./locale":5}],5:[function(require,module,exports){

var KeyCombo = require('./key-combo');


function Locale(name) {
  this.localeName     = name;
  this.pressedKeys    = [];
  this._appliedMacros = [];
  this._keyMap        = {};
  this._killKeyCodes  = [];
  this._macros        = [];
}

Locale.prototype.bindKeyCode = function(keyCode, keyNames) {
  if (typeof keyNames === 'string') {
    keyNames = [keyNames];
  }

  this._keyMap[keyCode] = keyNames;
};

Locale.prototype.bindMacro = function(keyComboStr, keyNames) {
  if (typeof keyNames === 'string') {
    keyNames = [ keyNames ];
  }

  var handler = null;
  if (typeof keyNames === 'function') {
    handler = keyNames;
    keyNames = null;
  }

  var macro = {
    keyCombo : new KeyCombo(keyComboStr),
    keyNames : keyNames,
    handler  : handler
  };

  this._macros.push(macro);
};

Locale.prototype.getKeyCodes = function(keyName) {
  var keyCodes = [];
  for (var keyCode in this._keyMap) {
    var index = this._keyMap[keyCode].indexOf(keyName);
    if (index > -1) { keyCodes.push(keyCode|0); }
  }
  return keyCodes;
};

Locale.prototype.getKeyNames = function(keyCode) {
  return this._keyMap[keyCode] || [];
};

Locale.prototype.setKillKey = function(keyCode) {
  if (typeof keyCode === 'string') {
    var keyCodes = this.getKeyCodes(keyCode);
    for (var i = 0; i < keyCodes.length; i += 1) {
      this.setKillKey(keyCodes[i]);
    }
    return;
  }

  this._killKeyCodes.push(keyCode);
};

Locale.prototype.pressKey = function(keyCode) {
  if (typeof keyCode === 'string') {
    var keyCodes = this.getKeyCodes(keyCode);
    for (var i = 0; i < keyCodes.length; i += 1) {
      this.pressKey(keyCodes[i]);
    }
    return;
  }

  var keyNames = this.getKeyNames(keyCode);
  for (var i = 0; i < keyNames.length; i += 1) {
    if (this.pressedKeys.indexOf(keyNames[i]) === -1) {
      this.pressedKeys.push(keyNames[i]);
    }
  }

  this._applyMacros();
};

Locale.prototype.releaseKey = function(keyCode) {
  if (typeof keyCode === 'string') {
    var keyCodes = this.getKeyCodes(keyCode);
    for (var i = 0; i < keyCodes.length; i += 1) {
      this.releaseKey(keyCodes[i]);
    }
  }

  else {
    var keyNames         = this.getKeyNames(keyCode);
    var killKeyCodeIndex = this._killKeyCodes.indexOf(keyCode);
    
    if (killKeyCodeIndex > -1) {
      this.pressedKeys.length = 0;
    } else {
      for (var i = 0; i < keyNames.length; i += 1) {
        var index = this.pressedKeys.indexOf(keyNames[i]);
        if (index > -1) {
          this.pressedKeys.splice(index, 1);
        }
      }
    }

    this._clearMacros();
  }
};

Locale.prototype._applyMacros = function() {
  var macros = this._macros.slice(0);
  for (var i = 0; i < macros.length; i += 1) {
    var macro = macros[i];
    if (macro.keyCombo.check(this.pressedKeys)) {
      if (macro.handler) {
        macro.keyNames = macro.handler(this.pressedKeys);
      }
      for (var j = 0; j < macro.keyNames.length; j += 1) {
        if (this.pressedKeys.indexOf(macro.keyNames[j]) === -1) {
          this.pressedKeys.push(macro.keyNames[j]);
        }
      }
      this._appliedMacros.push(macro);
    }
  }
};

Locale.prototype._clearMacros = function() {
  for (var i = 0; i < this._appliedMacros.length; i += 1) {
    var macro = this._appliedMacros[i];
    if (!macro.keyCombo.check(this.pressedKeys)) {
      for (var j = 0; j < macro.keyNames.length; j += 1) {
        var index = this.pressedKeys.indexOf(macro.keyNames[j]);
        if (index > -1) {
          this.pressedKeys.splice(index, 1);
        }
      }
      if (macro.handler) {
        macro.keyNames = null;
      }
      this._appliedMacros.splice(i, 1);
      i -= 1;
    }
  }
};


module.exports = Locale;

},{"./key-combo":3}],6:[function(require,module,exports){

module.exports = function(locale, platform, userAgent) {

  // general
  locale.bindKeyCode(3,   ['cancel']);
  locale.bindKeyCode(8,   ['backspace']);
  locale.bindKeyCode(9,   ['tab']);
  locale.bindKeyCode(12,  ['clear']);
  locale.bindKeyCode(13,  ['enter']);
  locale.bindKeyCode(16,  ['shift']);
  locale.bindKeyCode(17,  ['ctrl']);
  locale.bindKeyCode(18,  ['alt', 'menu']);
  locale.bindKeyCode(19,  ['pause', 'break']);
  locale.bindKeyCode(20,  ['capslock']);
  locale.bindKeyCode(27,  ['escape', 'esc']);
  locale.bindKeyCode(32,  ['space', 'spacebar']);
  locale.bindKeyCode(33,  ['pageup']);
  locale.bindKeyCode(34,  ['pagedown']);
  locale.bindKeyCode(35,  ['end']);
  locale.bindKeyCode(36,  ['home']);
  locale.bindKeyCode(37,  ['left']);
  locale.bindKeyCode(38,  ['up']);
  locale.bindKeyCode(39,  ['right']);
  locale.bindKeyCode(40,  ['down']);
  locale.bindKeyCode(41,  ['select']);
  locale.bindKeyCode(42,  ['printscreen']);
  locale.bindKeyCode(43,  ['execute']);
  locale.bindKeyCode(44,  ['snapshot']);
  locale.bindKeyCode(45,  ['insert', 'ins']);
  locale.bindKeyCode(46,  ['delete', 'del']);
  locale.bindKeyCode(47,  ['help']);
  locale.bindKeyCode(145, ['scrolllock', 'scroll']);
  locale.bindKeyCode(187, ['equal', 'equalsign', '=']);
  locale.bindKeyCode(188, ['comma', ',']);
  locale.bindKeyCode(190, ['period', '.']);
  locale.bindKeyCode(191, ['slash', 'forwardslash', '/']);
  locale.bindKeyCode(192, ['graveaccent', '`']);
  locale.bindKeyCode(219, ['openbracket', '[']);
  locale.bindKeyCode(220, ['backslash', '\\']);
  locale.bindKeyCode(221, ['closebracket', ']']);
  locale.bindKeyCode(222, ['apostrophe', '\'']);

  // 0-9
  locale.bindKeyCode(48, ['zero', '0']);
  locale.bindKeyCode(49, ['one', '1']);
  locale.bindKeyCode(50, ['two', '2']);
  locale.bindKeyCode(51, ['three', '3']);
  locale.bindKeyCode(52, ['four', '4']);
  locale.bindKeyCode(53, ['five', '5']);
  locale.bindKeyCode(54, ['six', '6']);
  locale.bindKeyCode(55, ['seven', '7']);
  locale.bindKeyCode(56, ['eight', '8']);
  locale.bindKeyCode(57, ['nine', '9']);

  // numpad
  locale.bindKeyCode(96, ['numzero', 'num0']);
  locale.bindKeyCode(97, ['numone', 'num1']);
  locale.bindKeyCode(98, ['numtwo', 'num2']);
  locale.bindKeyCode(99, ['numthree', 'num3']);
  locale.bindKeyCode(100, ['numfour', 'num4']);
  locale.bindKeyCode(101, ['numfive', 'num5']);
  locale.bindKeyCode(102, ['numsix', 'num6']);
  locale.bindKeyCode(103, ['numseven', 'num7']);
  locale.bindKeyCode(104, ['numeight', 'num8']);
  locale.bindKeyCode(105, ['numnine', 'num9']);
  locale.bindKeyCode(106, ['nummultiply', 'num*']);
  locale.bindKeyCode(107, ['numadd', 'num+']);
  locale.bindKeyCode(108, ['numenter']);
  locale.bindKeyCode(109, ['numsubtract', 'num-']);
  locale.bindKeyCode(110, ['numdecimal', 'num.']);
  locale.bindKeyCode(111, ['numdivide', 'num/']);
  locale.bindKeyCode(144, ['numlock', 'num']);

  // function keys
  locale.bindKeyCode(112, ['f1']);
  locale.bindKeyCode(113, ['f2']);
  locale.bindKeyCode(114, ['f3']);
  locale.bindKeyCode(115, ['f4']);
  locale.bindKeyCode(116, ['f5']);
  locale.bindKeyCode(117, ['f6']);
  locale.bindKeyCode(118, ['f7']);
  locale.bindKeyCode(119, ['f8']);
  locale.bindKeyCode(120, ['f9']);
  locale.bindKeyCode(121, ['f10']);
  locale.bindKeyCode(122, ['f11']);
  locale.bindKeyCode(123, ['f12']);

  // secondary key symbols
  locale.bindMacro('shift + `', ['tilde', '~']);
  locale.bindMacro('shift + 1', ['exclamation', 'exclamationpoint', '!']);
  locale.bindMacro('shift + 2', ['at', '@']);
  locale.bindMacro('shift + 3', ['number', '#']);
  locale.bindMacro('shift + 4', ['dollar', 'dollars', 'dollarsign', '$']);
  locale.bindMacro('shift + 5', ['percent', '%']);
  locale.bindMacro('shift + 6', ['caret', '^']);
  locale.bindMacro('shift + 7', ['ampersand', 'and', '&']);
  locale.bindMacro('shift + 8', ['asterisk', '*']);
  locale.bindMacro('shift + 9', ['openparen', '(']);
  locale.bindMacro('shift + 0', ['closeparen', ')']);
  locale.bindMacro('shift + -', ['underscore', '_']);
  locale.bindMacro('shift + =', ['plus', '+']);
  locale.bindMacro('shift + [', ['opencurlybrace', 'opencurlybracket', '{']);
  locale.bindMacro('shift + ]', ['closecurlybrace', 'closecurlybracket', '}']);
  locale.bindMacro('shift + \\', ['verticalbar', '|']);
  locale.bindMacro('shift + ;', ['colon', ':']);
  locale.bindMacro('shift + \'', ['quotationmark', '\'']);
  locale.bindMacro('shift + !,', ['openanglebracket', '<']);
  locale.bindMacro('shift + .', ['closeanglebracket', '>']);
  locale.bindMacro('shift + /', ['questionmark', '?']);
  
  if (platform.match('Mac')) {
    locale.bindMacro('command', ['mod', 'modifier']);
  } else {
    locale.bindMacro('ctrl', ['mod', 'modifier']);
  }

  //a-z and A-Z
  for (var keyCode = 65; keyCode <= 90; keyCode += 1) {
    var keyName = String.fromCharCode(keyCode + 32);
    var capitalKeyName = String.fromCharCode(keyCode);
  	locale.bindKeyCode(keyCode, keyName);
  	locale.bindMacro('shift + ' + keyName, capitalKeyName);
  	locale.bindMacro('capslock + ' + keyName, capitalKeyName);
  }

  // browser caveats
  var semicolonKeyCode = userAgent.match('Firefox') ? 59  : 186;
  var dashKeyCode      = userAgent.match('Firefox') ? 173 : 189;
  var leftCommandKeyCode;
  var rightCommandKeyCode;
  if (platform.match('Mac') && (userAgent.match('Safari') || userAgent.match('Chrome'))) {
    leftCommandKeyCode  = 91;
    rightCommandKeyCode = 93;
  } else if(platform.match('Mac') && userAgent.match('Opera')) {
    leftCommandKeyCode  = 17;
    rightCommandKeyCode = 17;
  } else if(platform.match('Mac') && userAgent.match('Firefox')) {
    leftCommandKeyCode  = 224;
    rightCommandKeyCode = 224;
  }
  locale.bindKeyCode(semicolonKeyCode,    ['semicolon', ';']);
  locale.bindKeyCode(dashKeyCode,         ['dash', '-']);
  locale.bindKeyCode(leftCommandKeyCode,  ['command', 'windows', 'win', 'super', 'leftcommand', 'leftwindows', 'leftwin', 'leftsuper']);
  locale.bindKeyCode(rightCommandKeyCode, ['command', 'windows', 'win', 'super', 'rightcommand', 'rightwindows', 'rightwin', 'rightsuper']);

  // kill keys
  locale.setKillKey('command');
};

},{}],7:[function(require,module,exports){
module.exports = function(subject) {
  validateSubject(subject);

  var eventsStorage = createEventsStorage(subject);
  subject.on = eventsStorage.on;
  subject.off = eventsStorage.off;
  subject.fire = eventsStorage.fire;
  return subject;
};

function createEventsStorage(subject) {
  // Store all event listeners to this hash. Key is event name, value is array
  // of callback records.
  //
  // A callback record consists of callback function and its optional context:
  // { 'eventName' => [{callback: function, ctx: object}] }
  var registeredEvents = Object.create(null);

  return {
    on: function (eventName, callback, ctx) {
      if (typeof callback !== 'function') {
        throw new Error('callback is expected to be a function');
      }
      var handlers = registeredEvents[eventName];
      if (!handlers) {
        handlers = registeredEvents[eventName] = [];
      }
      handlers.push({callback: callback, ctx: ctx});

      return subject;
    },

    off: function (eventName, callback) {
      var wantToRemoveAll = (typeof eventName === 'undefined');
      if (wantToRemoveAll) {
        // Killing old events storage should be enough in this case:
        registeredEvents = Object.create(null);
        return subject;
      }

      if (registeredEvents[eventName]) {
        var deleteAllCallbacksForEvent = (typeof callback !== 'function');
        if (deleteAllCallbacksForEvent) {
          delete registeredEvents[eventName];
        } else {
          var callbacks = registeredEvents[eventName];
          for (var i = 0; i < callbacks.length; ++i) {
            if (callbacks[i].callback === callback) {
              callbacks.splice(i, 1);
            }
          }
        }
      }

      return subject;
    },

    fire: function (eventName) {
      var callbacks = registeredEvents[eventName];
      if (!callbacks) {
        return subject;
      }

      var fireArguments;
      if (arguments.length > 1) {
        fireArguments = Array.prototype.splice.call(arguments, 1);
      }
      for(var i = 0; i < callbacks.length; ++i) {
        var callbackInfo = callbacks[i];
        callbackInfo.callback.apply(callbackInfo.ctx, fireArguments);
      }

      return subject;
    }
  };
}

function validateSubject(subject) {
  if (!subject) {
    throw new Error('Eventify cannot use falsy object as events subject');
  }
  var reservedWords = ['on', 'fire', 'off'];
  for (var i = 0; i < reservedWords.length; ++i) {
    if (subject.hasOwnProperty(reservedWords[i])) {
      throw new Error("Subject cannot be eventified, since it already has property '" + reservedWords[i] + "'");
    }
  }
}

},{}],8:[function(require,module,exports){
/**
 * @fileOverview Contains definition of the core graph object.
 */

// TODO: need to change storage layer:
// 1. Be able to get all nodes O(1)
// 2. Be able to get number of links O(1)

/**
 * @example
 *  var graph = require('ngraph.graph')();
 *  graph.addNode(1);     // graph has one node.
 *  graph.addLink(2, 3);  // now graph contains three nodes and one link.
 *
 */
module.exports = createGraph;

var eventify = require('ngraph.events');

/**
 * Creates a new graph
 */
function createGraph(options) {
  // Graph structure is maintained as dictionary of nodes
  // and array of links. Each node has 'links' property which
  // hold all links related to that node. And general links
  // array is used to speed up all links enumeration. This is inefficient
  // in terms of memory, but simplifies coding.
  options = options || {};
  if ('uniqueLinkId' in options) {
    console.warn(
      'ngraph.graph: Starting from version 0.14 `uniqueLinkId` is deprecated.\n' +
      'Use `multigraph` option instead\n',
      '\n',
      'Note: there is also change in default behavior: From now own each graph\n'+
      'is considered to be not a multigraph by default (each edge is unique).'
    );

    options.multigraph = options.uniqueLinkId;
  }

  // Dear reader, the non-multigraphs do not guarantee that there is only
  // one link for a given pair of node. When this option is set to false
  // we can save some memory and CPU (18% faster for non-multigraph);
  if (options.multigraph === undefined) options.multigraph = false;

  var nodes = typeof Object.create === 'function' ? Object.create(null) : {},
    links = [],
    // Hash of multi-edges. Used to track ids of edges between same nodes
    multiEdges = {},
    nodesCount = 0,
    suspendEvents = 0,

    forEachNode = createNodeIterator(),
    createLink = options.multigraph ? createUniqueLink : createSingleLink,

    // Our graph API provides means to listen to graph changes. Users can subscribe
    // to be notified about changes in the graph by using `on` method. However
    // in some cases they don't use it. To avoid unnecessary memory consumption
    // we will not record graph changes until we have at least one subscriber.
    // Code below supports this optimization.
    //
    // Accumulates all changes made during graph updates.
    // Each change element contains:
    //  changeType - one of the strings: 'add', 'remove' or 'update';
    //  node - if change is related to node this property is set to changed graph's node;
    //  link - if change is related to link this property is set to changed graph's link;
    changes = [],
    recordLinkChange = noop,
    recordNodeChange = noop,
    enterModification = noop,
    exitModification = noop;

  // this is our public API:
  var graphPart = {
    /**
     * Adds node to the graph. If node with given id already exists in the graph
     * its data is extended with whatever comes in 'data' argument.
     *
     * @param nodeId the node's identifier. A string or number is preferred.
     * @param [data] additional data for the node being added. If node already
     *   exists its data object is augmented with the new one.
     *
     * @return {node} The newly added node or node with given id if it already exists.
     */
    addNode: addNode,

    /**
     * Adds a link to the graph. The function always create a new
     * link between two nodes. If one of the nodes does not exists
     * a new node is created.
     *
     * @param fromId link start node id;
     * @param toId link end node id;
     * @param [data] additional data to be set on the new link;
     *
     * @return {link} The newly created link
     */
    addLink: addLink,

    /**
     * Removes link from the graph. If link does not exist does nothing.
     *
     * @param link - object returned by addLink() or getLinks() methods.
     *
     * @returns true if link was removed; false otherwise.
     */
    removeLink: removeLink,

    /**
     * Removes node with given id from the graph. If node does not exist in the graph
     * does nothing.
     *
     * @param nodeId node's identifier passed to addNode() function.
     *
     * @returns true if node was removed; false otherwise.
     */
    removeNode: removeNode,

    /**
     * Gets node with given identifier. If node does not exist undefined value is returned.
     *
     * @param nodeId requested node identifier;
     *
     * @return {node} in with requested identifier or undefined if no such node exists.
     */
    getNode: getNode,

    /**
     * Gets number of nodes in this graph.
     *
     * @return number of nodes in the graph.
     */
    getNodesCount: function () {
      return nodesCount;
    },

    /**
     * Gets total number of links in the graph.
     */
    getLinksCount: function () {
      return links.length;
    },

    /**
     * Gets all links (inbound and outbound) from the node with given id.
     * If node with given id is not found null is returned.
     *
     * @param nodeId requested node identifier.
     *
     * @return Array of links from and to requested node if such node exists;
     *   otherwise null is returned.
     */
    getLinks: getLinks,

    /**
     * Invokes callback on each node of the graph.
     *
     * @param {Function(node)} callback Function to be invoked. The function
     *   is passed one argument: visited node.
     */
    forEachNode: forEachNode,

    /**
     * Invokes callback on every linked (adjacent) node to the given one.
     *
     * @param nodeId Identifier of the requested node.
     * @param {Function(node, link)} callback Function to be called on all linked nodes.
     *   The function is passed two parameters: adjacent node and link object itself.
     * @param oriented if true graph treated as oriented.
     */
    forEachLinkedNode: forEachLinkedNode,

    /**
     * Enumerates all links in the graph
     *
     * @param {Function(link)} callback Function to be called on all links in the graph.
     *   The function is passed one parameter: graph's link object.
     *
     * Link object contains at least the following fields:
     *  fromId - node id where link starts;
     *  toId - node id where link ends,
     *  data - additional data passed to graph.addLink() method.
     */
    forEachLink: forEachLink,

    /**
     * Suspend all notifications about graph changes until
     * endUpdate is called.
     */
    beginUpdate: enterModification,

    /**
     * Resumes all notifications about graph changes and fires
     * graph 'changed' event in case there are any pending changes.
     */
    endUpdate: exitModification,

    /**
     * Removes all nodes and links from the graph.
     */
    clear: clear,

    /**
     * Detects whether there is a link between two nodes.
     * Operation complexity is O(n) where n - number of links of a node.
     * NOTE: this function is synonim for getLink()
     *
     * @returns link if there is one. null otherwise.
     */
    hasLink: getLink,

    /**
     * Detects whether there is a node with given id
     * 
     * Operation complexity is O(1)
     * NOTE: this function is synonim for getNode()
     *
     * @returns node if there is one; Falsy value otherwise.
     */
    hasNode: getNode,

    /**
     * Gets an edge between two nodes.
     * Operation complexity is O(n) where n - number of links of a node.
     *
     * @param {string} fromId link start identifier
     * @param {string} toId link end identifier
     *
     * @returns link if there is one. null otherwise.
     */
    getLink: getLink
  };

  // this will add `on()` and `fire()` methods.
  eventify(graphPart);

  monitorSubscribers();

  return graphPart;

  function monitorSubscribers() {
    var realOn = graphPart.on;

    // replace real `on` with our temporary on, which will trigger change
    // modification monitoring:
    graphPart.on = on;

    function on() {
      // now it's time to start tracking stuff:
      graphPart.beginUpdate = enterModification = enterModificationReal;
      graphPart.endUpdate = exitModification = exitModificationReal;
      recordLinkChange = recordLinkChangeReal;
      recordNodeChange = recordNodeChangeReal;

      // this will replace current `on` method with real pub/sub from `eventify`.
      graphPart.on = realOn;
      // delegate to real `on` handler:
      return realOn.apply(graphPart, arguments);
    }
  }

  function recordLinkChangeReal(link, changeType) {
    changes.push({
      link: link,
      changeType: changeType
    });
  }

  function recordNodeChangeReal(node, changeType) {
    changes.push({
      node: node,
      changeType: changeType
    });
  }

  function addNode(nodeId, data) {
    if (nodeId === undefined) {
      throw new Error('Invalid node identifier');
    }

    enterModification();

    var node = getNode(nodeId);
    if (!node) {
      node = new Node(nodeId, data);
      nodesCount++;
      recordNodeChange(node, 'add');
    } else {
      node.data = data;
      recordNodeChange(node, 'update');
    }

    nodes[nodeId] = node;

    exitModification();
    return node;
  }

  function getNode(nodeId) {
    return nodes[nodeId];
  }

  function removeNode(nodeId) {
    var node = getNode(nodeId);
    if (!node) {
      return false;
    }

    enterModification();

    var prevLinks = node.links;
    if (prevLinks) {
      node.links = null;
      for(var i = 0; i < prevLinks.length; ++i) {
        removeLink(prevLinks[i]);
      }
    }

    delete nodes[nodeId];
    nodesCount--;

    recordNodeChange(node, 'remove');

    exitModification();

    return true;
  }


  function addLink(fromId, toId, data) {
    enterModification();

    var fromNode = getNode(fromId) || addNode(fromId);
    var toNode = getNode(toId) || addNode(toId);

    var link = createLink(fromId, toId, data);

    links.push(link);

    // TODO: this is not cool. On large graphs potentially would consume more memory.
    addLinkToNode(fromNode, link);
    if (fromId !== toId) {
      // make sure we are not duplicating links for self-loops
      addLinkToNode(toNode, link);
    }

    recordLinkChange(link, 'add');

    exitModification();

    return link;
  }

  function createSingleLink(fromId, toId, data) {
    var linkId = makeLinkId(fromId, toId);
    return new Link(fromId, toId, data, linkId);
  }

  function createUniqueLink(fromId, toId, data) {
    // TODO: Get rid of this method.
    var linkId = makeLinkId(fromId, toId);
    var isMultiEdge = multiEdges.hasOwnProperty(linkId);
    if (isMultiEdge || getLink(fromId, toId)) {
      if (!isMultiEdge) {
        multiEdges[linkId] = 0;
      }
      var suffix = '@' + (++multiEdges[linkId]);
      linkId = makeLinkId(fromId + suffix, toId + suffix);
    }

    return new Link(fromId, toId, data, linkId);
  }

  function getLinks(nodeId) {
    var node = getNode(nodeId);
    return node ? node.links : null;
  }

  function removeLink(link) {
    if (!link) {
      return false;
    }
    var idx = indexOfElementInArray(link, links);
    if (idx < 0) {
      return false;
    }

    enterModification();

    links.splice(idx, 1);

    var fromNode = getNode(link.fromId);
    var toNode = getNode(link.toId);

    if (fromNode) {
      idx = indexOfElementInArray(link, fromNode.links);
      if (idx >= 0) {
        fromNode.links.splice(idx, 1);
      }
    }

    if (toNode) {
      idx = indexOfElementInArray(link, toNode.links);
      if (idx >= 0) {
        toNode.links.splice(idx, 1);
      }
    }

    recordLinkChange(link, 'remove');

    exitModification();

    return true;
  }

  function getLink(fromNodeId, toNodeId) {
    // TODO: Use sorted links to speed this up
    var node = getNode(fromNodeId),
      i;
    if (!node || !node.links) {
      return null;
    }

    for (i = 0; i < node.links.length; ++i) {
      var link = node.links[i];
      if (link.fromId === fromNodeId && link.toId === toNodeId) {
        return link;
      }
    }

    return null; // no link.
  }

  function clear() {
    enterModification();
    forEachNode(function(node) {
      removeNode(node.id);
    });
    exitModification();
  }

  function forEachLink(callback) {
    var i, length;
    if (typeof callback === 'function') {
      for (i = 0, length = links.length; i < length; ++i) {
        callback(links[i]);
      }
    }
  }

  function forEachLinkedNode(nodeId, callback, oriented) {
    var node = getNode(nodeId);

    if (node && node.links && typeof callback === 'function') {
      if (oriented) {
        return forEachOrientedLink(node.links, nodeId, callback);
      } else {
        return forEachNonOrientedLink(node.links, nodeId, callback);
      }
    }
  }

  function forEachNonOrientedLink(links, nodeId, callback) {
    var quitFast;
    for (var i = 0; i < links.length; ++i) {
      var link = links[i];
      var linkedNodeId = link.fromId === nodeId ? link.toId : link.fromId;

      quitFast = callback(nodes[linkedNodeId], link);
      if (quitFast) {
        return true; // Client does not need more iterations. Break now.
      }
    }
  }

  function forEachOrientedLink(links, nodeId, callback) {
    var quitFast;
    for (var i = 0; i < links.length; ++i) {
      var link = links[i];
      if (link.fromId === nodeId) {
        quitFast = callback(nodes[link.toId], link);
        if (quitFast) {
          return true; // Client does not need more iterations. Break now.
        }
      }
    }
  }

  // we will not fire anything until users of this library explicitly call `on()`
  // method.
  function noop() {}

  // Enter, Exit modification allows bulk graph updates without firing events.
  function enterModificationReal() {
    suspendEvents += 1;
  }

  function exitModificationReal() {
    suspendEvents -= 1;
    if (suspendEvents === 0 && changes.length > 0) {
      graphPart.fire('changed', changes);
      changes.length = 0;
    }
  }

  function createNodeIterator() {
    // Object.keys iterator is 1.3x faster than `for in` loop.
    // See `https://github.com/anvaka/ngraph.graph/tree/bench-for-in-vs-obj-keys`
    // branch for perf test
    return Object.keys ? objectKeysIterator : forInIterator;
  }

  function objectKeysIterator(callback) {
    if (typeof callback !== 'function') {
      return;
    }

    var keys = Object.keys(nodes);
    for (var i = 0; i < keys.length; ++i) {
      if (callback(nodes[keys[i]])) {
        return true; // client doesn't want to proceed. Return.
      }
    }
  }

  function forInIterator(callback) {
    if (typeof callback !== 'function') {
      return;
    }
    var node;

    for (node in nodes) {
      if (callback(nodes[node])) {
        return true; // client doesn't want to proceed. Return.
      }
    }
  }
}

// need this for old browsers. Should this be a separate module?
function indexOfElementInArray(element, array) {
  if (!array) return -1;

  if (array.indexOf) {
    return array.indexOf(element);
  }

  var len = array.length,
    i;

  for (i = 0; i < len; i += 1) {
    if (array[i] === element) {
      return i;
    }
  }

  return -1;
}

/**
 * Internal structure to represent node;
 */
function Node(id, data) {
  this.id = id;
  this.links = null;
  this.data = data;
}

function addLinkToNode(node, link) {
  if (node.links) {
    node.links.push(link);
  } else {
    node.links = [link];
  }
}

/**
 * Internal structure to represent links;
 */
function Link(fromId, toId, data, id) {
  this.fromId = fromId;
  this.toId = toId;
  this.data = data;
  this.id = id;
}

function hashCode(str) {
  var hash = 0, i, chr, len;
  if (str.length == 0) return hash;
  for (i = 0, len = str.length; i < len; i++) {
    chr   = str.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

function makeLinkId(fromId, toId) {
  return fromId.toString() + '👉 ' + toId.toString();
}

},{"ngraph.events":7}],9:[function(require,module,exports){
/**
 * Based on https://github.com/mourner/tinyqueue
 * Copyright (c) 2017, Vladimir Agafonkin https://github.com/mourner/tinyqueue/blob/master/LICENSE
 * 
 * Adapted for PathFinding needs by @anvaka
 * Copyright (c) 2017, Andrei Kashcha
 */
module.exports = NodeHeap;

function NodeHeap(data, options) {
  if (!(this instanceof NodeHeap)) return new NodeHeap(data, options);

  if (!Array.isArray(data)) {
    // assume first argument is our config object;
    options = data;
    data = [];
  }

  options = options || {};

  this.data = data || [];
  this.length = this.data.length;
  this.compare = options.compare || defaultCompare;
  this.setNodeId = options.setNodeId || noop;

  if (this.length > 0) {
    for (var i = (this.length >> 1); i >= 0; i--) this._down(i);
  }

  if (options.setNodeId) {
    for (var i = 0; i < this.length; ++i) {
      this.setNodeId(this.data[i], i);
    }
  }
}

function noop() {}

function defaultCompare(a, b) {
  return a - b;
}

NodeHeap.prototype = {

  push: function (item) {
    this.data.push(item);
    this.setNodeId(item, this.length);
    this.length++;
    this._up(this.length - 1);
  },

  pop: function () {
    if (this.length === 0) return undefined;

    var top = this.data[0];
    this.length--;

    if (this.length > 0) {
      this.data[0] = this.data[this.length];
      this.setNodeId(this.data[0], 0);
      this._down(0);
    }
    this.data.pop();

    return top;
  },

  peek: function () {
    return this.data[0];
  },

  updateItem: function (pos) {
    this._down(pos);
    this._up(pos);
  },

  _up: function (pos) {
    var data = this.data;
    var compare = this.compare;
    var setNodeId = this.setNodeId;
    var item = data[pos];

    while (pos > 0) {
      var parent = (pos - 1) >> 1;
      var current = data[parent];
      if (compare(item, current) >= 0) break;
        data[pos] = current;

       setNodeId(current, pos);
       pos = parent;
    }

    data[pos] = item;
    setNodeId(item, pos);
  },

  _down: function (pos) {
    var data = this.data;
    var compare = this.compare;
    var halfLength = this.length >> 1;
    var item = data[pos];
    var setNodeId = this.setNodeId;

    while (pos < halfLength) {
      var left = (pos << 1) + 1;
      var right = left + 1;
      var best = data[left];

      if (right < this.length && compare(data[right], best) < 0) {
        left = right;
        best = data[right];
      }
      if (compare(best, item) >= 0) break;

      data[pos] = best;
      setNodeId(best, pos);
      pos = left;
    }

    data[pos] = item;
    setNodeId(item, pos);
  }
};
},{}],10:[function(require,module,exports){
/**
 * Performs suboptimal, greed A Star path finding.
 * This finder does not necessary finds the shortest path. The path
 * that it finds is very close to the shortest one. It is very fast though.
 */
module.exports = aStarBi;

var NodeHeap = require('./NodeHeap');
var makeSearchStatePool = require('./makeSearchStatePool');
var heuristics = require('./heuristics');
var defaultSettings = require('./defaultSettings');

var BY_FROM = 1;
var BY_TO = 2;
var NO_PATH = defaultSettings.NO_PATH;

module.exports.l2 = heuristics.l2;
module.exports.l1 = heuristics.l1;

/**
 * Creates a new instance of pathfinder. A pathfinder has just one method:
 * `find(fromId, toId)`, it may be extended in future.
 * 
 * NOTE: Algorithm implemented in this code DOES NOT find optimal path.
 * Yet the path that it finds is always near optimal, and it finds it very fast.
 * 
 * @param {ngraph.graph} graph instance. See https://github.com/anvaka/ngraph.graph
 * 
 * @param {Object} options that configures search
 * @param {Function(a, b)} options.heuristic - a function that returns estimated distance between
 * nodes `a` and `b`.  Defaults function returns 0, which makes this search equivalent to Dijkstra search.
 * @param {Function(a, b)} options.distance - a function that returns actual distance between two
 * nodes `a` and `b`. By default this is set to return graph-theoretical distance (always 1);
 * 
 * @returns {Object} A pathfinder with single method `find()`.
 */
function aStarBi(graph, options) {
  options = options || {};
  // whether traversal should be considered over oriented graph.
  var oriented = options.oriented;

  var heuristic = options.heuristic;
  if (!heuristic) heuristic = defaultSettings.heuristic;

  var distance = options.distance;
  if (!distance) distance = defaultSettings.distance;
  var pool = makeSearchStatePool();

  return {
    find: find
  };

  function find(fromId, toId) {
    // Not sure if we should return NO_PATH or throw. Throw seem to be more
    // helpful to debug errors. So, throwing.
    var from = graph.getNode(fromId);
    if (!from) throw new Error('fromId is not defined in this graph: ' + fromId);
    var to = graph.getNode(toId);
    if (!to) throw new Error('toId is not defined in this graph: ' + toId);

    if (from === to) return [from]; // trivial case.

    pool.reset();

    var callVisitor = oriented ? orientedVisitor : nonOrientedVisitor;

    // Maps nodeId to NodeSearchState.
    var nodeState = new Map();

    var openSetFrom = new NodeHeap({
      compare: defaultSettings.compareFScore,
      setNodeId: defaultSettings.setHeapIndex
    });

    var openSetTo = new NodeHeap({
      compare: defaultSettings.compareFScore,
      setNodeId: defaultSettings.setHeapIndex
    });


    var startNode = pool.createNewState(from);
    nodeState.set(fromId, startNode);

    // For the first node, fScore is completely heuristic.
    startNode.fScore = heuristic(from, to);
    // The cost of going from start to start is zero.
    startNode.distanceToSource = 0;
    openSetFrom.push(startNode);
    startNode.open = BY_FROM;

    var endNode = pool.createNewState(to);
    endNode.fScore = heuristic(to, from);
    endNode.distanceToSource = 0;
    openSetTo.push(endNode);
    endNode.open = BY_TO;

    // Cost of the best solution found so far. Used for accurate termination
    var lMin = Number.POSITIVE_INFINITY;
    var minFrom;
    var minTo;

    var currentSet = openSetFrom;
    var currentOpener = BY_FROM;

    while (openSetFrom.length > 0 && openSetTo.length > 0) {
      if (openSetFrom.length < openSetTo.length) {
        // we pick a set with less elements
        currentOpener = BY_FROM;
        currentSet = openSetFrom;
      } else {
        currentOpener = BY_TO;
        currentSet = openSetTo;
      }

      var current = currentSet.pop();

      // no need to visit this node anymore
      current.closed = true;

      if (current.distanceToSource > lMin) continue;

      graph.forEachLinkedNode(current.node.id, callVisitor);

      if (minFrom && minTo) {
        // This is not necessary the best path, but we are so greedy that we
        // can't resist:
        return reconstructBiDirectionalPath(minFrom, minTo);
      }
    }

    return NO_PATH; // No path.

    function nonOrientedVisitor(otherNode, link) {
      return visitNode(otherNode, link, current);
    }

    function orientedVisitor(otherNode, link) {
      // For oritned graphs we need to reverse graph, when traveling
      // backwards. So, we use non-oriented ngraph's traversal, and 
      // filter link orientation here.
      if (currentOpener === BY_FROM) {
        if (link.fromId === current.node.id) return visitNode(otherNode, link, current)
      } else if (currentOpener === BY_TO) {
        if (link.toId === current.node.id) return visitNode(otherNode, link, current);
      }
    }

    function canExit(currentNode) {
      var opener = currentNode.open
      if (opener && opener !== currentOpener) {
        return true;
      }

      return false;
    }

    function reconstructBiDirectionalPath(a, b) {
      var pathOfNodes = [];
      var aParent = a;
      while(aParent) {
        pathOfNodes.push(aParent.node);
        aParent = aParent.parent;
      }
      var bParent = b;
      while (bParent) {
        pathOfNodes.unshift(bParent.node);
        bParent = bParent.parent
      }
      return pathOfNodes;
    }

    function visitNode(otherNode, link, cameFrom) {
      var otherSearchState = nodeState.get(otherNode.id);
      if (!otherSearchState) {
        otherSearchState = pool.createNewState(otherNode);
        nodeState.set(otherNode.id, otherSearchState);
      }

      if (otherSearchState.closed) {
        // Already processed this node.
        return;
      }

      if (canExit(otherSearchState, cameFrom)) {
        // this node was opened by alternative opener. The sets intersect now,
        // we found an optimal path, that goes through *this* node. However, there
        // is no guarantee that this is the global optimal solution path.

        var potentialLMin = otherSearchState.distanceToSource + cameFrom.distanceToSource;
        if (potentialLMin < lMin) {
          minFrom = otherSearchState;
          minTo = cameFrom
          lMin = potentialLMin;
        }
        // we are done with this node.
        return;
      }

      var tentativeDistance = cameFrom.distanceToSource + distance(otherSearchState.node, cameFrom.node, link);

      if (tentativeDistance >= otherSearchState.distanceToSource) {
        // This would only make our path longer. Ignore this route.
        return;
      }

      // Choose target based on current working set:
      var target = (currentOpener === BY_FROM) ? to : from;
      var newFScore = tentativeDistance + heuristic(otherSearchState.node, target);
      if (newFScore >= lMin) {
        // this can't be optimal path, as we have already found a shorter path.
        return;
      }
      otherSearchState.fScore = newFScore;

      if (otherSearchState.open === 0) {
        // Remember this node in the current set
        currentSet.push(otherSearchState);
        currentSet.updateItem(otherSearchState.heapIndex);

        otherSearchState.open = currentOpener;
      }

      // bingo! we found shorter path:
      otherSearchState.parent = cameFrom;
      otherSearchState.distanceToSource = tentativeDistance;
    }
  }
}

},{"./NodeHeap":9,"./defaultSettings":12,"./heuristics":13,"./makeSearchStatePool":14}],11:[function(require,module,exports){
/**
 * Performs a uni-directional A Star search on graph.
 * 
 * We will try to minimize f(n) = g(n) + h(n), where
 * g(n) is actual distance from source node to `n`, and
 * h(n) is heuristic distance from `n` to target node.
 */
module.exports = aStarPathSearch;

var NodeHeap = require('./NodeHeap');
var makeSearchStatePool = require('./makeSearchStatePool');
var heuristics = require('./heuristics');
var defaultSettings = require('./defaultSettings.js');

var NO_PATH = defaultSettings.NO_PATH;

module.exports.l2 = heuristics.l2;
module.exports.l1 = heuristics.l1;

/**
 * Creates a new instance of pathfinder. A pathfinder has just one method:
 * `find(fromId, toId)`, it may be extended in future.
 * 
 * @param {ngraph.graph} graph instance. See https://github.com/anvaka/ngraph.graph
 * @param {Object} options that configures search
 * @param {Function(a, b)} options.heuristic - a function that returns estimated distance between
 * nodes `a` and `b`. This function should never overestimate actual distance between two
 * nodes (otherwise the found path will not be the shortest). Defaults function returns 0,
 * which makes this search equivalent to Dijkstra search.
 * @param {Function(a, b)} options.distance - a function that returns actual distance between two
 * nodes `a` and `b`. By default this is set to return graph-theoretical distance (always 1);
 * 
 * @returns {Object} A pathfinder with single method `find()`.
 */
function aStarPathSearch(graph, options) {
  options = options || {};
  // whether traversal should be considered over oriented graph.
  var oriented = options.oriented;

  var heuristic = options.heuristic;
  if (!heuristic) heuristic = defaultSettings.heuristic;

  var distance = options.distance;
  if (!distance) distance = defaultSettings.distance;
  var pool = makeSearchStatePool();

  return {
    /**
     * Finds a path between node `fromId` and `toId`.
     * @returns {Array} of nodes between `toId` and `fromId`. Empty array is returned
     * if no path is found.
     */
    find: find
  };

  function find(fromId, toId) {
    var from = graph.getNode(fromId);
    if (!from) throw new Error('fromId is not defined in this graph: ' + fromId);
    var to = graph.getNode(toId);
    if (!to) throw new Error('toId is not defined in this graph: ' + toId);
    pool.reset();

    // Maps nodeId to NodeSearchState.
    var nodeState = new Map();

    // the nodes that we still need to evaluate
    var openSet = new NodeHeap({
      compare: defaultSettings.compareFScore,
      setNodeId: defaultSettings.setHeapIndex
    });

    var startNode = pool.createNewState(from);
    nodeState.set(fromId, startNode);

    // For the first node, fScore is completely heuristic.
    startNode.fScore = heuristic(from, to);

    // The cost of going from start to start is zero.
    startNode.distanceToSource = 0;
    openSet.push(startNode);
    startNode.open = 1;

    var cameFrom;

    while (openSet.length > 0) {
      cameFrom = openSet.pop();
      if (goalReached(cameFrom, to)) return reconstructPath(cameFrom);

      // no need to visit this node anymore
      cameFrom.closed = true;
      graph.forEachLinkedNode(cameFrom.node.id, visitNeighbour, oriented);
    }

    // If we got here, then there is no path.
    return NO_PATH;

    function visitNeighbour(otherNode, link) {
      var otherSearchState = nodeState.get(otherNode.id);
      if (!otherSearchState) {
        otherSearchState = pool.createNewState(otherNode);
        nodeState.set(otherNode.id, otherSearchState);
      }

      if (otherSearchState.closed) {
        // Already processed this node.
        return;
      }
      if (otherSearchState.open === 0) {
        // Remember this node.
        openSet.push(otherSearchState);
        otherSearchState.open = 1;
      }

      var tentativeDistance = cameFrom.distanceToSource + distance(otherNode, cameFrom.node, link);
      if (tentativeDistance >= otherSearchState.distanceToSource) {
        // This would only make our path longer. Ignore this route.
        return;
      }

      // bingo! we found shorter path:
      otherSearchState.parent = cameFrom;
      otherSearchState.distanceToSource = tentativeDistance;
      otherSearchState.fScore = tentativeDistance + heuristic(otherSearchState.node, to);

      openSet.updateItem(otherSearchState.heapIndex);
    }
  }
}

function goalReached(searchState, targetNode) {
  return searchState.node === targetNode;
}

function reconstructPath(searchState) {
  var path = [searchState.node];
  var parent = searchState.parent;

  while (parent) {
    path.push(parent.node);
    parent = parent.parent;
  }

  return path;
}

},{"./NodeHeap":9,"./defaultSettings.js":12,"./heuristics":13,"./makeSearchStatePool":14}],12:[function(require,module,exports){
// We reuse instance of array, but we trie to freeze it as well,
// so that consumers don't modify it. Maybe it's a bad idea.
var NO_PATH = [];
if (typeof Object.freeze === 'function') Object.freeze(NO_PATH);

module.exports = {
  // Path search settings
  heuristic: blindHeuristic,
  distance: constantDistance,
  compareFScore: compareFScore,
  NO_PATH: NO_PATH,

  // heap settings
  setHeapIndex: setHeapIndex,

  // nba:
  setH1: setH1,
  setH2: setH2,
  compareF1Score: compareF1Score,
  compareF2Score: compareF2Score,
}

function blindHeuristic(/* a, b */) {
  // blind heuristic makes this search equal to plain Dijkstra path search.
  return 0;
}

function constantDistance(/* a, b */) {
  return 1;
}

function compareFScore(a, b) {
  var result = a.fScore - b.fScore;
  // TODO: Can I improve speed with smarter ties-breaking?
  // I tried distanceToSource, but it didn't seem to have much effect
  return result;
}

function setHeapIndex(nodeSearchState, heapIndex) {
  nodeSearchState.heapIndex = heapIndex;
}

function compareF1Score(a, b) {
  return a.f1 - b.f1;
}

function compareF2Score(a, b) {
  return a.f2 - b.f2;
}

function setH1(node, heapIndex) {
  node.h1 = heapIndex;
}

function setH2(node, heapIndex) {
  node.h2 = heapIndex;
}
},{}],13:[function(require,module,exports){
module.exports = {
  l2: l2,
  l1: l1
};

/**
 * Euclid distance (l2 norm);
 * 
 * @param {*} a 
 * @param {*} b 
 */
function l2(a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Manhattan distance (l1 norm);
 * @param {*} a 
 * @param {*} b 
 */
function l1(a, b) {
  var dx = a.x - b.x;
  var dy = a.y - b.y;
  return Math.abs(dx) + Math.abs(dy);
}

},{}],14:[function(require,module,exports){
/**
 * This class represents a single search node in the exploration tree for
 * A* algorithm.
 * 
 * @param {Object} node  original node in the graph
 */
function NodeSearchState(node) {
  this.node = node;

  // How we came to this node?
  this.parent = null;

  this.closed = false;
  this.open = 0;

  this.distanceToSource = Number.POSITIVE_INFINITY;
  // the f(n) = g(n) + h(n) value
  this.fScore = Number.POSITIVE_INFINITY;

  // used to reconstruct heap when fScore is updated.
  this.heapIndex = -1;
};

function makeSearchStatePool() {
  var currentInCache = 0;
  var nodeCache = [];

  return {
    createNewState: createNewState,
    reset: reset
  };

  function reset() {
    currentInCache = 0;
  }

  function createNewState(node) {
    var cached = nodeCache[currentInCache];
    if (cached) {
      // TODO: This almost duplicates constructor code. Not sure if
      // it would impact performance if I move this code into a function
      cached.node = node;
      // How we came to this node?
      cached.parent = null;

      cached.closed = false;
      cached.open = 0;

      cached.distanceToSource = Number.POSITIVE_INFINITY;
      // the f(n) = g(n) + h(n) value
      cached.fScore = Number.POSITIVE_INFINITY;

      // used to reconstruct heap when fScore is updated.
      cached.heapIndex = -1;

    } else {
      cached = new NodeSearchState(node);
      nodeCache[currentInCache] = cached;
    }
    currentInCache++;
    return cached;
  }
}
module.exports = makeSearchStatePool;
},{}],15:[function(require,module,exports){
module.exports = nba;

var NodeHeap = require('../NodeHeap');
var heuristics = require('../heuristics');
var defaultSettings = require('../defaultSettings.js');
var makeNBASearchStatePool = require('./makeNBASearchStatePool.js');

var NO_PATH = defaultSettings.NO_PATH;

module.exports.l2 = heuristics.l2;
module.exports.l1 = heuristics.l1;

/**
 * Creates a new instance of pathfinder. A pathfinder has just one method:
 * `find(fromId, toId)`.
 * 
 * This is implementation of the NBA* algorithm described in 
 * 
 *  "Yet another bidirectional algorithm for shortest paths" paper by Wim Pijls and Henk Post
 * 
 * The paper is available here: https://repub.eur.nl/pub/16100/ei2009-10.pdf
 * 
 * @param {ngraph.graph} graph instance. See https://github.com/anvaka/ngraph.graph
 * @param {Object} options that configures search
 * @param {Function(a, b)} options.heuristic - a function that returns estimated distance between
 * nodes `a` and `b`. This function should never overestimate actual distance between two
 * nodes (otherwise the found path will not be the shortest). Defaults function returns 0,
 * which makes this search equivalent to Dijkstra search.
 * @param {Function(a, b)} options.distance - a function that returns actual distance between two
 * nodes `a` and `b`. By default this is set to return graph-theoretical distance (always 1);
 * 
 * @returns {Object} A pathfinder with single method `find()`.
 */
function nba(graph, options) {
  options = options || {};
  // whether traversal should be considered over oriented graph.
  var oriented = options.oriented;
  var quitFast = options.quitFast;

  var heuristic = options.heuristic;
  if (!heuristic) heuristic = defaultSettings.heuristic;

  var distance = options.distance;
  if (!distance) distance = defaultSettings.distance;

  // During stress tests I noticed that garbage collection was one of the heaviest
  // contributors to the algorithm's speed. So I'm using an object pool to recycle nodes.
  var pool = makeNBASearchStatePool();

  return {
    /**
     * Finds a path between node `fromId` and `toId`.
     * @returns {Array} of nodes between `toId` and `fromId`. Empty array is returned
     * if no path is found.
     */
    find: find
  };

  function find(fromId, toId) {
    // I must apologize for the code duplication. This was the easiest way for me to
    // implement the algorithm fast.
    var from = graph.getNode(fromId);
    if (!from) throw new Error('fromId is not defined in this graph: ' + fromId);
    var to = graph.getNode(toId);
    if (!to) throw new Error('toId is not defined in this graph: ' + toId);

    pool.reset();

    // I must also apologize for somewhat cryptic names. The NBA* is bi-directional
    // search algorithm, which means it runs two searches in parallel. One runs
    // from source node to target, while the other one runs from target to source.
    // Everywhere where you see `1` it means it's for the forward search. `2` is for 
    // backward search.

    // For oriented graph path finding, we need to reverse the graph, so that
    // backward search visits correct link. Obviously we don't want to duplicate
    // the graph, instead we always traverse the graph as non-oriented, and filter
    // edges in `visitN1Oriented/visitN2Oritented`
    var forwardVisitor = oriented ? visitN1Oriented : visitN1;
    var reverseVisitor = oriented ? visitN2Oriented : visitN2;

    // Maps nodeId to NBASearchState.
    var nodeState = new Map();

    // These two heaps store nodes by their underestimated values.
    var open1Set = new NodeHeap({
      compare: defaultSettings.compareF1Score,
      setNodeId: defaultSettings.setH1
    });
    var open2Set = new NodeHeap({
      compare: defaultSettings.compareF2Score,
      setNodeId: defaultSettings.setH2
    });

    // This is where both searches will meet.
    var minNode;

    // The smallest path length seen so far is stored here:
    var lMin = Number.POSITIVE_INFINITY;

    // We start by putting start/end nodes to the corresponding heaps
    var startNode = pool.createNewState(from);
    nodeState.set(fromId, startNode); 
    startNode.g1 = 0;
    var f1 = heuristic(from, to);
    startNode.f1 = f1;
    open1Set.push(startNode);

    var endNode = pool.createNewState(to);
    nodeState.set(toId, endNode);
    endNode.g2 = 0;
    var f2 = f1; // they should agree originally
    endNode.f2 = f2;
    open2Set.push(endNode)

    // the `cameFrom` variable is accessed by both searches, so that we can store parents.
    var cameFrom;

    // this is the main algorithm loop:
    while (open2Set.length && open1Set.length) {
      if (open1Set.length < open2Set.length) {
        forwardSearch();
      } else {
        reverseSearch();
      }

      if (quitFast && minNode) break;
    }

    // If we got here, then there is no path.
    var path = reconstructPath(minNode);
    return path; // the public API is over

    function forwardSearch() {
      cameFrom = open1Set.pop();
      if (cameFrom.closed) {
        return;
      }

      cameFrom.closed = true;

      if (cameFrom.f1 < lMin && (cameFrom.g1 + f2 - heuristic(from, cameFrom.node)) < lMin) {
        graph.forEachLinkedNode(cameFrom.node.id, forwardVisitor);
      }

      if (open1Set.length > 0) {
        f1 = open1Set.peek().f1;
      } 
    }

    function reverseSearch() {
      cameFrom = open2Set.pop();
      if (cameFrom.closed) {
        return;
      }
      cameFrom.closed = true;

      if (cameFrom.f2 < lMin && (cameFrom.g2 + f1 - heuristic(cameFrom.node, to)) < lMin) {
        graph.forEachLinkedNode(cameFrom.node.id, reverseVisitor);
      }

      if (open2Set.length > 0) {
        f2 = open2Set.peek().f2;
      }
    }

    function visitN1(otherNode, link) {
      var otherSearchState = nodeState.get(otherNode.id);
      if (!otherSearchState) {
        otherSearchState = pool.createNewState(otherNode);
        nodeState.set(otherNode.id, otherSearchState);
      }

      if (otherSearchState.closed) return;

      var tentativeDistance = cameFrom.g1 + distance(cameFrom.node, otherNode, link);

      if (tentativeDistance < otherSearchState.g1) {
        otherSearchState.g1 = tentativeDistance;
        otherSearchState.f1 = tentativeDistance + heuristic(otherSearchState.node, to);
        otherSearchState.p1 = cameFrom;
        if (otherSearchState.h1 < 0) {
          open1Set.push(otherSearchState);
        } else {
          open1Set.updateItem(otherSearchState.h1);
        }
      }
      var potentialMin = otherSearchState.g1 + otherSearchState.g2;
      if (potentialMin < lMin) { 
        lMin = potentialMin;
        minNode = otherSearchState;
      }
    }

    function visitN2(otherNode, link) {
      var otherSearchState = nodeState.get(otherNode.id);
      if (!otherSearchState) {
        otherSearchState = pool.createNewState(otherNode);
        nodeState.set(otherNode.id, otherSearchState);
      }

      if (otherSearchState.closed) return;

      var tentativeDistance = cameFrom.g2 + distance(cameFrom.node, otherNode, link);

      if (tentativeDistance < otherSearchState.g2) {
        otherSearchState.g2 = tentativeDistance;
        otherSearchState.f2 = tentativeDistance + heuristic(from, otherSearchState.node);
        otherSearchState.p2 = cameFrom;
        if (otherSearchState.h2 < 0) {
          open2Set.push(otherSearchState);
        } else {
          open2Set.updateItem(otherSearchState.h2);
        }
      }
      var potentialMin = otherSearchState.g1 + otherSearchState.g2;
      if (potentialMin < lMin) {
        lMin = potentialMin;
        minNode = otherSearchState;
      }
    }

    function visitN2Oriented(otherNode, link) {
      // we are going backwards, graph needs to be reversed. 
      if (link.toId === cameFrom.node.id) return visitN2(otherNode, link);
    }
    function visitN1Oriented(otherNode, link) {
      // this is forward direction, so we should be coming FROM:
      if (link.fromId === cameFrom.node.id) return visitN1(otherNode, link);
    }
  }
}

function reconstructPath(searchState) {
  if (!searchState) return NO_PATH;

  var path = [searchState.node];
  var parent = searchState.p1;

  while (parent) {
    path.push(parent.node);
    parent = parent.p1;
  }

  var child = searchState.p2;

  while (child) {
    path.unshift(child.node);
    child = child.p2;
  }
  return path;
}

},{"../NodeHeap":9,"../defaultSettings.js":12,"../heuristics":13,"./makeNBASearchStatePool.js":16}],16:[function(require,module,exports){
module.exports = makeNBASearchStatePool;

/**
 * Creates new instance of NBASearchState. The instance stores information
 * about search state, and is used by NBA* algorithm.
 *
 * @param {Object} node - original graph node
 */
function NBASearchState(node) {
  /**
   * Original graph node.
   */
  this.node = node;

  /**
   * Parent of this node in forward search
   */
  this.p1 = null;

  /**
   * Parent of this node in reverse search
   */
  this.p2 = null;

  /**
   * If this is set to true, then the node was already processed
   * and we should not touch it anymore.
   */
  this.closed = false;

  /**
   * Actual distance from this node to its parent in forward search
   */
  this.g1 = Number.POSITIVE_INFINITY;

  /**
   * Actual distance from this node to its parent in reverse search
   */
  this.g2 = Number.POSITIVE_INFINITY;


  /**
   * Underestimated distance from this node to the path-finding source.
   */
  this.f1 = Number.POSITIVE_INFINITY;

  /**
   * Underestimated distance from this node to the path-finding target.
   */
  this.f2 = Number.POSITIVE_INFINITY;

  // used to reconstruct heap when fScore is updated. TODO: do I need them both?

  /**
   * Index of this node in the forward heap.
   */
  this.h1 = -1;

  /**
   * Index of this node in the reverse heap.
   */
  this.h2 = -1;
}

/**
 * As path-finding is memory-intensive process, we want to reduce pressure on
 * garbage collector. This class helps us to recycle path-finding nodes and significantly
 * reduces the search time (~20% faster than without it).
 */
function makeNBASearchStatePool() {
  var currentInCache = 0;
  var nodeCache = [];

  return {
    /**
     * Creates a new NBASearchState instance
     */
    createNewState: createNewState,

    /**
     * Marks all created instances available for recycling.
     */
    reset: reset
  };

  function reset() {
    currentInCache = 0;
  }

  function createNewState(node) {
    var cached = nodeCache[currentInCache];
    if (cached) {
      // TODO: This almost duplicates constructor code. Not sure if
      // it would impact performance if I move this code into a function
      cached.node = node;

      // How we came to this node?
      cached.p1 = null;
      cached.p2 = null;

      cached.closed = false;

      cached.g1 = Number.POSITIVE_INFINITY;
      cached.g2 = Number.POSITIVE_INFINITY;
      cached.f1 = Number.POSITIVE_INFINITY;
      cached.f2 = Number.POSITIVE_INFINITY;

      // used to reconstruct heap when fScore is updated.
      cached.h1 = -1;
      cached.h2 = -1;
    } else {
      cached = new NBASearchState(node);
      nodeCache[currentInCache] = cached;
    }
    currentInCache++;
    return cached;
  }
}

},{}],17:[function(require,module,exports){
module.exports = {
  aStar: require('./a-star/a-star.js'),
  aGreedy: require('./a-star/a-greedy-star'),
  nba: require('./a-star/nba/index.js'),
}

},{"./a-star/a-greedy-star":10,"./a-star/a-star.js":11,"./a-star/nba/index.js":15}],18:[function(require,module,exports){
'use strict';

var _Application = require('./lib/Application');

var _Application2 = _interopRequireDefault(_Application);

var _LoadingScene = require('./scenes/LoadingScene');

var _LoadingScene2 = _interopRequireDefault(_LoadingScene);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

// Create a Pixi Application
var app = new _Application2.default({
  width: 256,
  height: 256,
  roundPixels: true,
  autoResize: true,
  resolution: 1,
  autoStart: false
});

app.renderer.view.style.position = 'absolute';
app.renderer.view.style.display = 'block';
app.renderer.resize(window.innerWidth, window.innerHeight);

// Add the canvas that Pixi automatically created for you to the HTML document
document.body.appendChild(app.view);

app.changeStage();
app.start();
app.changeScene(_LoadingScene2.default);

},{"./lib/Application":21,"./scenes/LoadingScene":58}],19:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var IS_MOBILE = exports.IS_MOBILE = function (a) {
  return (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55\/|capi|ccwa|cdm-|cell|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene|gf-5|g-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h-|oo|p-)|sdk\/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel(i|m)|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-|your|zeto|zte-/i.test(a.substr(0, 4))
  );
}(navigator.userAgent || navigator.vendor || window.opera);

var CEIL_SIZE = exports.CEIL_SIZE = 32;

var ABILITY_MOVE = exports.ABILITY_MOVE = Symbol('move');
var ABILITY_CAMERA = exports.ABILITY_CAMERA = Symbol('camera');
var ABILITY_OPERATE = exports.ABILITY_OPERATE = Symbol('operate');
var ABILITY_KEY_MOVE = exports.ABILITY_KEY_MOVE = Symbol('key-move');
var ABILITY_LIFE = exports.ABILITY_LIFE = Symbol('life');
var ABILITY_CARRY = exports.ABILITY_CARRY = Symbol('carry');
var ABILITY_LEARN = exports.ABILITY_LEARN = Symbol('learn');
var ABILITY_PLACE = exports.ABILITY_PLACE = Symbol('place');
var ABILITY_KEY_PLACE = exports.ABILITY_KEY_PLACE = Symbol('key-place');
var ABILITY_KEY_FIRE = exports.ABILITY_KEY_FIRE = Symbol('fire');
var ABILITIES_ALL = exports.ABILITIES_ALL = [ABILITY_MOVE, ABILITY_CAMERA, ABILITY_OPERATE, ABILITY_KEY_MOVE, ABILITY_LIFE, ABILITY_CARRY, ABILITY_LEARN, ABILITY_PLACE, ABILITY_KEY_PLACE, ABILITY_KEY_FIRE];

// object type, static object, not collide with
var STATIC = exports.STATIC = 'static';
// collide with
var STAY = exports.STAY = 'stay';
// touch will reply
var REPLY = exports.REPLY = 'reply';

},{}],20:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var LEFT = exports.LEFT = 'a';
var UP = exports.UP = 'w';
var RIGHT = exports.RIGHT = 'd';
var DOWN = exports.DOWN = 's';
var PLACE1 = exports.PLACE1 = '1';
var PLACE2 = exports.PLACE2 = '2';
var PLACE3 = exports.PLACE3 = '3';
var PLACE4 = exports.PLACE4 = '4';
var FIRE = exports.FIRE = 'f';

},{}],21:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;var desc = Object.getOwnPropertyDescriptor(object, property);if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;if (getter === undefined) {
      return undefined;
    }return getter.call(receiver);
  }
};

var _PIXI = require('./PIXI');

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var Application = function (_PixiApplication) {
  _inherits(Application, _PixiApplication);

  function Application() {
    _classCallCheck(this, Application);

    return _possibleConstructorReturn(this, (Application.__proto__ || Object.getPrototypeOf(Application)).apply(this, arguments));
  }

  _createClass(Application, [{
    key: 'changeStage',
    value: function changeStage() {
      this.stage = new _PIXI.display.Stage();
    }
  }, {
    key: 'changeScene',
    value: function changeScene(SceneName, params) {
      if (this.currentScene) {
        // maybe use promise for animation
        // remove gameloop?
        this.currentScene.destroy();
        this.stage.removeChild(this.currentScene);
      }

      var scene = new SceneName(params);
      this.stage.addChild(scene);
      scene.create();
      scene.on('changeScene', this.changeScene.bind(this));

      this.currentScene = scene;
    }
  }, {
    key: 'start',
    value: function start() {
      var _get2,
          _this2 = this;

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      (_get2 = _get(Application.prototype.__proto__ || Object.getPrototypeOf(Application.prototype), 'start', this)).call.apply(_get2, [this].concat(args));

      // create a background make stage has width & height
      var view = this.renderer.view;
      this.stage.addChild(new _PIXI.Graphics().drawRect(0, 0, view.width, view.height));

      // Start the game loop
      this.ticker.add(function (delta) {
        return _this2.gameLoop.bind(_this2)(delta);
      });
    }
  }, {
    key: 'gameLoop',
    value: function gameLoop(delta) {
      // Update the current game state:
      this.currentScene.tick(delta);
    }
  }]);

  return Application;
}(_PIXI.Application);

exports.default = Application;

},{"./PIXI":28}],22:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/* global PIXI, Bump */

exports.default = new Bump(PIXI);

},{}],23:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _constants = require('../config/constants');

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

var o = {
  get: function get(target, property) {
    // has STAY object will return 1, otherwise 0
    if (property === 'weight') {
      return target.some(function (o) {
        return o.type === _constants.STAY;
      }) ? 1 : 0;
    } else {
      return target[property];
    }
  }
};

var GameObjects = function GameObjects() {
  _classCallCheck(this, GameObjects);

  for (var _len = arguments.length, items = Array(_len), _key = 0; _key < _len; _key++) {
    items[_key] = arguments[_key];
  }

  return new Proxy([].concat(items), o);
};

exports.default = GameObjects;

},{"../config/constants":19}],24:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _PIXI = require('./PIXI');

var _constants = require('../config/constants');

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

var LIGHT = Symbol('light');

var Light = function () {
  function Light() {
    _classCallCheck(this, Light);
  }

  _createClass(Light, null, [{
    key: 'lightOn',
    value: function lightOn(target, radius) {
      var rand = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;

      var container = target.parent;
      if (!container.lighting) {
        // container does NOT has lighting property
        return;
      }
      var lightbulb = new _PIXI.Graphics();
      var rr = 0xff;
      var rg = 0xff;
      var rb = 0xff;
      var rad = radius * _constants.CEIL_SIZE;

      var x = target.width / 2 / target.scale.x;
      var y = target.height / 2 / target.scale.y;
      lightbulb.beginFill((rr << 16) + (rg << 8) + rb, 1.0);
      lightbulb.drawCircle(x, y, rad);
      lightbulb.endFill();
      lightbulb.parentLayer = container.lighting; // must has property: lighting

      target[LIGHT] = {
        light: lightbulb
      };
      target.addChild(lightbulb);

      if (rand !== 1) {
        var interval = setInterval(function () {
          var dScale = Math.random() * (1 - rand);
          if (lightbulb.scale.x > 1) {
            dScale = -dScale;
          }
          lightbulb.scale.x += dScale;
          lightbulb.scale.y += dScale;
          lightbulb.alpha += dScale;
        }, 1000 / 12);
        target[LIGHT].interval = interval;
      }
    }
  }, {
    key: 'lightOff',
    value: function lightOff(target) {
      if (!target[LIGHT]) {
        // no light to remove
        return;
      }
      // remove light
      target.removeChild(target[LIGHT].light);
      // remove interval
      clearInterval(target[LIGHT].interval);
      delete target[LIGHT];
      // remove listener
      target.off('removed', Light.lightOff);
    }
  }]);

  return Light;
}();

exports.default = Light;

},{"../config/constants":19,"./PIXI":28}],25:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];var _n = true;var _d = false;var _e = undefined;try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;_e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }return _arr;
  }return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _PIXI = require('./PIXI');

var _constants = require('../config/constants');

var _utils = require('./utils');

var _MapGraph = require('./MapGraph');

var _MapGraph2 = _interopRequireDefault(_MapGraph);

var _Bump = require('../lib/Bump');

var _Bump2 = _interopRequireDefault(_Bump);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var pipe = function pipe(first) {
  for (var _len = arguments.length, more = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    more[_key - 1] = arguments[_key];
  }

  return more.reduce(function (acc, curr) {
    return function () {
      return curr(acc.apply(undefined, arguments));
    };
  }, first);
};

/**
 * events:
 *  use: object
 */

var Map = function (_Container) {
  _inherits(Map, _Container);

  function Map() {
    var scale = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

    _classCallCheck(this, Map);

    var _this = _possibleConstructorReturn(this, (Map.__proto__ || Object.getPrototypeOf(Map)).call(this));

    _this.ceilSize = scale * _constants.CEIL_SIZE;
    _this.mapScale = scale;

    _this.collideObjects = [];
    _this.replyObjects = [];
    _this.tickObjects = [];
    _this.map = new _PIXI.Container();
    _this.addChild(_this.map);

    // player group
    _this.playerGroup = new _PIXI.display.Group();
    var playerLayer = new _PIXI.display.Layer(_this.playerGroup);
    _this.addChild(playerLayer);
    _this.mapGraph = new _MapGraph2.default();
    return _this;
  }

  _createClass(Map, [{
    key: 'enableFog',
    value: function enableFog() {
      var lighting = new _PIXI.display.Layer();
      lighting.on('display', function (element) {
        element.blendMode = _PIXI.BLEND_MODES.ADD;
      });
      lighting.useRenderTexture = true;
      lighting.clearColor = [0, 0, 0, 1]; // ambient gray

      this.addChild(lighting);

      var lightingSprite = new _PIXI.Sprite(lighting.getRenderTexture());
      lightingSprite.blendMode = _PIXI.BLEND_MODES.MULTIPLY;

      this.addChild(lightingSprite);

      this.map.lighting = lighting;
    }

    // 消除迷霧

  }, {
    key: 'disableFog',
    value: function disableFog() {
      this.lighting.clearColor = [1, 1, 1, 1];
    }
  }, {
    key: 'load',
    value: function load(mapData) {
      var _this2 = this;

      var tiles = mapData.tiles;
      var cols = mapData.cols;
      var rows = mapData.rows;
      var items = mapData.items;

      var ceilSize = this.ceilSize;
      var mapScale = this.mapScale;

      if (mapData.hasFog) {
        this.enableFog();
      }
      var mapGraph = this.mapGraph;

      var addGameObject = function addGameObject(i, j, id, params) {
        var o = (0, _utils.instanceByItemId)(id, params);
        o.position.set(i * ceilSize, j * ceilSize);
        o.scale.set(mapScale, mapScale);

        switch (o.type) {
          case _constants.STATIC:
            break;
          case _constants.STAY:
            // 靜態物件
            _this2.collideObjects.push(o);
            break;
          default:
            _this2.replyObjects.push(o);
        }
        _this2.map.addChild(o);

        return [o, i, j];
      };

      var addGraph = function addGraph(_ref) {
        var _ref2 = _slicedToArray(_ref, 3),
            o = _ref2[0],
            i = _ref2[1],
            j = _ref2[2];

        return mapGraph.addObject(o, i, j);
      };

      var registerOn = function registerOn(_ref3) {
        var _ref4 = _slicedToArray(_ref3, 3),
            o = _ref4[0],
            i = _ref4[1],
            j = _ref4[2];

        o.on('use', function () {
          return _this2.emit('use', o);
        });
        o.on('removed', function () {
          var inx = _this2.replyObjects.indexOf(o);
          _this2.replyObjects.splice(inx, 1);
          // TODO: remove map item
          // delete items[i]
        });
        return [o, i, j];
      };

      mapGraph.beginUpdate();

      for (var i = 0; i < cols; i++) {
        for (var j = 0; j < rows; j++) {
          pipe(addGameObject, addGraph)(i, j, tiles[j * cols + i]);
        }
      }
      items.forEach(function (item) {
        var _item = _slicedToArray(item, 3),
            id = _item[0],
            _item$ = _slicedToArray(_item[1], 2),
            i = _item$[0],
            j = _item$[1],
            params = _item[2];

        pipe(addGameObject, registerOn, addGraph)(i, j, id, params);
      });

      mapGraph.endUpdate();
    }
  }, {
    key: 'addPlayer',
    value: function addPlayer(player, toPosition) {
      var _this3 = this;

      player.position.set(toPosition[0] * this.ceilSize, toPosition[1] * this.ceilSize);
      player.scale.set(this.mapScale, this.mapScale);
      player.parentGroup = this.playerGroup;
      this.map.addChild(player);

      player.onPlace = this.addGameObject.bind(this, player);
      player.on('place', player.onPlace);
      player.once('removed', function () {
        player.off('place', player.onPlace);
      });
      player.onFire = this.onFire.bind(this);
      player.on('fire', player.onFire);
      player.once('removed', function () {
        player.off('fire', player.onFire);
      });
      this.tickObjects.push(player);

      // 自動找路
      var moveAbility = player[_constants.ABILITY_MOVE];
      if (moveAbility) {
        var points = ['4,1', '4,4', '11,1', '6,10'];
        points.reduce(function (acc, cur) {
          var path = _this3.mapGraph.find(acc, cur).map(function (node) {
            var _node$id$split = node.id.split(','),
                _node$id$split2 = _slicedToArray(_node$id$split, 2),
                i = _node$id$split2[0],
                j = _node$id$split2[1];

            return { x: i * _this3.ceilSize, y: j * _this3.ceilSize };
          });
          moveAbility.addPath(path);
          return cur;
        });
      }
    }
  }, {
    key: 'tick',
    value: function tick(delta) {
      var objects = this.tickObjects;
      objects.forEach(function (o) {
        return o.tick(delta);
      });
      // collide detect
      for (var i = this.collideObjects.length - 1; i >= 0; i--) {
        for (var j = objects.length - 1; j >= 0; j--) {
          var o = this.collideObjects[i];
          var o2 = objects[j];
          if (_Bump2.default.rectangleCollision(o2, o, true)) {
            o.emit('collide', o2);
          }
        }
      }

      for (var _i = this.replyObjects.length - 1; _i >= 0; _i--) {
        for (var _j = objects.length - 1; _j >= 0; _j--) {
          var _o = this.replyObjects[_i];
          var _o2 = objects[_j];
          if (_Bump2.default.hitTestRectangle(_o2, _o)) {
            _o.emit('collide', _o2);
          }
        }
      }
    }
  }, {
    key: 'addGameObject',
    value: function addGameObject(player, object) {
      var mapScale = this.mapScale;
      var position = player.position;
      object.position.set(position.x.toFixed(0), position.y.toFixed(0));
      object.scale.set(mapScale, mapScale);
      this.map.addChild(object);
    }
  }, {
    key: 'onFire',
    value: function onFire(bullet) {
      var _this4 = this;

      bullet.on('collide', function () {
        var inx = _this4.tickObjects.indexOf(bullet);
        _this4.tickObjects.splice(inx, 1);
      });
      this.tickObjects.push(bullet);
      this.map.addChild(bullet);
    }

    // fog 的 parent container 不能被移動(會錯位)，因此改成修改 map 位置

  }, {
    key: 'position',
    get: function get() {
      return this.map.position;
    }
  }, {
    key: 'x',
    get: function get() {
      return this.map.x;
    },
    set: function set(x) {
      this.map.x = x;
    }
  }, {
    key: 'y',
    get: function get() {
      return this.map.y;
    },
    set: function set(y) {
      this.map.y = y;
    }
  }]);

  return Map;
}(_PIXI.Container);

exports.default = Map;

},{"../config/constants":19,"../lib/Bump":22,"./MapGraph":26,"./PIXI":28,"./utils":32}],26:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _ngraph = require('ngraph.graph');

var _ngraph2 = _interopRequireDefault(_ngraph);

var _ngraph3 = require('ngraph.path');

var _ngraph4 = _interopRequireDefault(_ngraph3);

var _GameObjects = require('./GameObjects');

var _GameObjects2 = _interopRequireDefault(_GameObjects);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

var MapGraph = function () {
  function MapGraph() {
    var scale = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1;

    _classCallCheck(this, MapGraph);

    this._graph = (0, _ngraph2.default)();
    this._finder = _ngraph4.default.aStar(this._graph, {
      // We tell our pathfinder what should it use as a distance function:
      distance: function distance(fromNode, toNode, link) {
        return fromNode.data.weight + toNode.data.weight + 1;
      }
    });
  }

  _createClass(MapGraph, [{
    key: 'addObject',
    value: function addObject(o, i, j) {
      var graph = this._graph;

      var selfName = [i, j].join(',');
      var node = graph.getNode(selfName);
      if (!node) {
        node = graph.addNode(selfName, new _GameObjects2.default(o));
      } else {
        node.data.push(o);
      }
      var link = function link(selfNode, otherNode) {
        if (!selfNode || !otherNode || graph.getLink(selfNode.id, otherNode.id)) {
          return;
        }
        var weight = selfNode.data.weight + otherNode.data.weight;
        if (weight === 0) {
          graph.addLink(selfNode.id, otherNode.id);
        }
      };
      if (node.data.weight !== 0) {
        // 此點不通，移除所有連結
        graph.forEachLinkedNode(selfName, function (linkedNode, link) {
          graph.removeLink(link);
        });
        return;
      }
      link(node, graph.getNode([i - 1, j].join(',')));
      link(node, graph.getNode([i, j - 1].join(',')));
      link(graph.getNode([i + 1, j].join(',')), node);
      link(graph.getNode([i, j + 1].join(',')), node);
    }
  }, {
    key: 'find',
    value: function find(from, to) {
      return this._finder.find(from, to);
    }
  }, {
    key: 'beginUpdate',
    value: function beginUpdate() {
      this._graph.beginUpdate();
    }
  }, {
    key: 'endUpdate',
    value: function endUpdate() {
      this._graph.endUpdate();
    }
  }]);

  return MapGraph;
}();

exports.default = MapGraph;

},{"./GameObjects":23,"ngraph.graph":8,"ngraph.path":17}],27:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var MAX_MESSAGE_COUNT = 500;

var Messages = function (_EventEmitter) {
  _inherits(Messages, _EventEmitter);

  function Messages() {
    _classCallCheck(this, Messages);

    var _this = _possibleConstructorReturn(this, (Messages.__proto__ || Object.getPrototypeOf(Messages)).call(this));

    _this._messages = [];
    return _this;
  }

  _createClass(Messages, [{
    key: 'add',
    value: function add(msg) {
      var length = this._messages.unshift(msg);
      if (length > MAX_MESSAGE_COUNT) {
        this._messages.pop();
      }
      this.emit('modified');
    }
  }, {
    key: 'list',
    get: function get() {
      return this._messages;
    }
  }]);

  return Messages;
}(_events2.default);

exports.default = new Messages();

},{"events":1}],28:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/* global PIXI */

var Application = exports.Application = PIXI.Application;
var Container = exports.Container = PIXI.Container;
var loader = exports.loader = PIXI.loader;
var resources = exports.resources = PIXI.loader.resources;
var Sprite = exports.Sprite = PIXI.Sprite;
var Text = exports.Text = PIXI.Text;
var TextStyle = exports.TextStyle = PIXI.TextStyle;

var Graphics = exports.Graphics = PIXI.Graphics;
var BLEND_MODES = exports.BLEND_MODES = PIXI.BLEND_MODES;
var display = exports.display = PIXI.display;
var utils = exports.utils = PIXI.utils;

},{}],29:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _PIXI = require('./PIXI');

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var Scene = function (_display$Layer) {
  _inherits(Scene, _display$Layer);

  function Scene() {
    _classCallCheck(this, Scene);

    return _possibleConstructorReturn(this, (Scene.__proto__ || Object.getPrototypeOf(Scene)).apply(this, arguments));
  }

  _createClass(Scene, [{
    key: 'create',
    value: function create() {}
  }, {
    key: 'destroy',
    value: function destroy() {}
  }, {
    key: 'tick',
    value: function tick(delta) {}
  }]);

  return Scene;
}(_PIXI.display.Layer);

exports.default = Scene;

},{"./PIXI":28}],30:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _PIXI = require('../lib/PIXI');

var Texture = {
  get TerrainAtlas() {
    return _PIXI.resources['images/terrain_atlas.json'];
  },
  get BaseOutAtlas() {
    return _PIXI.resources['images/base_out_atlas.json'];
  },

  get Air() {
    return Texture.TerrainAtlas.textures['empty.png'];
  },
  get Grass() {
    return Texture.TerrainAtlas.textures['grass.png'];
  },
  get Ground() {
    return Texture.TerrainAtlas.textures['brick-tile.png'];
  },

  get Wall() {
    return Texture.TerrainAtlas.textures['wall.png'];
  },
  get IronFence() {
    return Texture.BaseOutAtlas.textures['iron-fence.png'];
  },
  get Root() {
    return Texture.TerrainAtlas.textures['root.png'];
  },
  get Tree() {
    return Texture.TerrainAtlas.textures['tree.png'];
  },

  get Treasure() {
    return Texture.BaseOutAtlas.textures['treasure.png'];
  },
  get Door() {
    return Texture.BaseOutAtlas.textures['iron-fence.png'];
  },
  get Torch() {
    return Texture.BaseOutAtlas.textures['torch.png'];
  },
  get GrassDecorate1() {
    return Texture.TerrainAtlas.textures['grass-decorate-1.png'];
  },
  get Bullet() {
    return Texture.BaseOutAtlas.textures['bullet.png'];
  },

  get Rock() {
    return Texture.TerrainAtlas.textures['rock.png'];
  }
};

exports.default = Texture;

},{"../lib/PIXI":28}],31:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

var degrees = 180 / Math.PI;

var Vector = function () {
  function Vector(x, y) {
    _classCallCheck(this, Vector);

    this.x = x;
    this.y = y;
  }

  _createClass(Vector, [{
    key: "clone",
    value: function clone() {
      return new Vector(this.x, this.y);
    }
  }, {
    key: "add",
    value: function add(v) {
      this.x += v.x;
      this.y += v.y;
      return this;
    }
  }, {
    key: "sub",
    value: function sub(v) {
      this.x -= v.x;
      this.y -= v.y;
      return this;
    }
  }, {
    key: "invert",
    value: function invert() {
      return this.multiplyScalar(-1);
    }
  }, {
    key: "multiplyScalar",
    value: function multiplyScalar(s) {
      this.x *= s;
      this.y *= s;
      return this;
    }
  }, {
    key: "divideScalar",
    value: function divideScalar(s) {
      if (s === 0) {
        this.x = 0;
        this.y = 0;
      } else {
        return this.multiplyScalar(1 / s);
      }
      return this;
    }
  }, {
    key: "dot",
    value: function dot(v) {
      return this.x * v.x + this.y * v.y;
    }
  }, {
    key: "lengthSq",
    value: function lengthSq() {
      return this.x * this.x + this.y * this.y;
    }
  }, {
    key: "normalize",
    value: function normalize() {
      return this.divideScalar(this.length);
    }
  }, {
    key: "distanceTo",
    value: function distanceTo(v) {
      return Math.sqrt(this.distanceToSq(v));
    }
  }, {
    key: "distanceToSq",
    value: function distanceToSq(v) {
      var dx = this.x - v.x;
      var dy = this.y - v.y;
      return dx * dx + dy * dy;
    }
  }, {
    key: "set",
    value: function set(x, y) {
      this.x = x;
      this.y = y;
      return this;
    }
  }, {
    key: "setX",
    value: function setX(x) {
      this.x = x;
      return this;
    }
  }, {
    key: "setY",
    value: function setY(y) {
      this.y = y;
      return this;
    }
  }, {
    key: "setLength",
    value: function setLength(l) {
      var oldLength = this.length;
      if (oldLength !== 0 && l !== oldLength) {
        this.multiplyScalar(l / oldLength);
      }
      return this;
    }
  }, {
    key: "lerp",
    value: function lerp(v, alpha) {
      this.x += (v.x - this.x) * alpha;
      this.y += (v.y - this.y) * alpha;
      return this;
    }
  }, {
    key: "rad",
    value: function rad() {
      return Math.atan2(this.y, this.x);
    }
  }, {
    key: "equals",
    value: function equals(v) {
      return this.x === v.x && this.y === v.y;
    }
  }, {
    key: "rotate",
    value: function rotate(theta) {
      var xtemp = this.x;
      this.x = this.x * Math.cos(theta) - this.y * Math.sin(theta);
      this.y = xtemp * Math.sin(theta) + this.y * Math.cos(theta);
      return this;
    }
  }, {
    key: "length",
    get: function get() {
      return Math.sqrt(this.x * this.x + this.y * this.y);
    }
  }, {
    key: "deg",
    get: function get() {
      return this.rad() * degrees;
    }
  }], [{
    key: "fromPoint",
    value: function fromPoint(p) {
      return new Vector(p.x, p.y);
    }
  }, {
    key: "fromDegLength",
    value: function fromDegLength(deg, length) {
      var x = length * Math.cos(deg);
      var y = length * Math.sin(deg);
      return new Vector(x, y);
    }
  }]);

  return Vector;
}();

exports.default = Vector;

},{}],32:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.instanceByItemId = instanceByItemId;

var _Wall = require('../objects/Wall');

var _Wall2 = _interopRequireDefault(_Wall);

var _Air = require('../objects/Air');

var _Air2 = _interopRequireDefault(_Air);

var _Grass = require('../objects/Grass');

var _Grass2 = _interopRequireDefault(_Grass);

var _Treasure = require('../objects/Treasure');

var _Treasure2 = _interopRequireDefault(_Treasure);

var _Door = require('../objects/Door');

var _Door2 = _interopRequireDefault(_Door);

var _Torch = require('../objects/Torch');

var _Torch2 = _interopRequireDefault(_Torch);

var _Ground = require('../objects/Ground');

var _Ground2 = _interopRequireDefault(_Ground);

var _IronFence = require('../objects/IronFence');

var _IronFence2 = _interopRequireDefault(_IronFence);

var _Root = require('../objects/Root');

var _Root2 = _interopRequireDefault(_Root);

var _Tree = require('../objects/Tree');

var _Tree2 = _interopRequireDefault(_Tree);

var _GrassDecorate = require('../objects/GrassDecorate1');

var _GrassDecorate2 = _interopRequireDefault(_GrassDecorate);

var _Bullet = require('../objects/Bullet');

var _Bullet2 = _interopRequireDefault(_Bullet);

var _Move = require('../objects/abilities/Move');

var _Move2 = _interopRequireDefault(_Move);

var _Camera = require('../objects/abilities/Camera');

var _Camera2 = _interopRequireDefault(_Camera);

var _Operate = require('../objects/abilities/Operate');

var _Operate2 = _interopRequireDefault(_Operate);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

// 0x0000 ~ 0x000f
var ItemsStatic = [_Air2.default, _Grass2.default, _Ground2.default];
// 0x0010 ~ 0x00ff
var ItemsStay = [
// 0x0010, 0x0011, 0x0012
_Wall2.default, _IronFence2.default, _Root2.default, _Tree2.default];
// 0x0100 ~ 0x01ff
var ItemsOther = [_Treasure2.default, _Door2.default, _Torch2.default, _GrassDecorate2.default, _Bullet2.default];
// 0x0200 ~ 0x02ff
var Abilities = [_Move2.default, _Camera2.default, _Operate2.default];

function instanceByItemId(itemId, params) {
  var Types = void 0;
  itemId = parseInt(itemId, 16);
  if ((itemId & 0xfff0) === 0) {
    // 地板
    Types = ItemsStatic;
  } else if ((itemId & 0xff00) === 0) {
    Types = ItemsStay;
    itemId -= 0x0010;
  } else if ((itemId & 0xff00) >>> 8 === 1) {
    Types = ItemsOther;
    itemId -= 0x0100;
  } else {
    Types = Abilities;
    itemId -= 0x0200;
  }
  return new Types[itemId](params);
}

},{"../objects/Air":33,"../objects/Bullet":34,"../objects/Door":36,"../objects/Grass":38,"../objects/GrassDecorate1":39,"../objects/Ground":40,"../objects/IronFence":41,"../objects/Root":42,"../objects/Torch":43,"../objects/Treasure":44,"../objects/Tree":45,"../objects/Wall":46,"../objects/abilities/Camera":48,"../objects/abilities/Move":55,"../objects/abilities/Operate":56}],33:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _Texture = require('../lib/Texture');

var _Texture2 = _interopRequireDefault(_Texture);

var _GameObject2 = require('./GameObject');

var _GameObject3 = _interopRequireDefault(_GameObject2);

var _constants = require('../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var Air = function (_GameObject) {
  _inherits(Air, _GameObject);

  function Air() {
    _classCallCheck(this, Air);

    // Create the cat sprite
    return _possibleConstructorReturn(this, (Air.__proto__ || Object.getPrototypeOf(Air)).call(this, _Texture2.default.Air));
  }

  _createClass(Air, [{
    key: 'type',
    get: function get() {
      return _constants.STATIC;
    }
  }]);

  return Air;
}(_GameObject3.default);

exports.default = Air;

},{"../config/constants":19,"../lib/Texture":30,"./GameObject":37}],34:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;var desc = Object.getOwnPropertyDescriptor(object, property);if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;if (getter === undefined) {
      return undefined;
    }return getter.call(receiver);
  }
};

var _Texture = require('../lib/Texture');

var _Texture2 = _interopRequireDefault(_Texture);

var _GameObject2 = require('./GameObject');

var _GameObject3 = _interopRequireDefault(_GameObject2);

var _constants = require('../config/constants');

var _Learn = require('./abilities/Learn');

var _Learn2 = _interopRequireDefault(_Learn);

var _Move = require('../objects/abilities/Move');

var _Move2 = _interopRequireDefault(_Move);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var Bullet = function (_GameObject) {
  _inherits(Bullet, _GameObject);

  function Bullet(speed) {
    _classCallCheck(this, Bullet);

    var _this = _possibleConstructorReturn(this, (Bullet.__proto__ || Object.getPrototypeOf(Bullet)).call(this, _Texture2.default.Bullet));

    new _Learn2.default().carryBy(_this).learn(new _Move2.default([speed, 0]));

    _this.on('collide', _this.actionWith.bind(_this));
    return _this;
  }

  _createClass(Bullet, [{
    key: 'actionWith',
    value: function actionWith(operator) {
      if (operator === this.owner) {
        return;
      }
      _get(Bullet.prototype.__proto__ || Object.getPrototypeOf(Bullet.prototype), 'say', this).call(this, ['hitted ', operator.toString(), '.'].join(''));

      this.parent.removeChild(this);
      this.destroy();
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'Bullet';
    }
  }, {
    key: 'say',
    value: function say() {
      // say nothing
    }
  }, {
    key: 'setDirection',
    value: function setDirection(point) {
      var moveAbility = this[_constants.ABILITY_MOVE];
      if (moveAbility) {
        moveAbility.setDirection(point);
      }
    }
  }, {
    key: 'tick',
    value: function tick(delta) {
      var _this2 = this;

      Object.values(this.tickAbilities).forEach(function (ability) {
        return ability.tick(delta, _this2);
      });
    }
  }, {
    key: 'type',
    get: function get() {
      return _constants.REPLY;
    }
  }]);

  return Bullet;
}(_GameObject3.default);

exports.default = Bullet;

},{"../config/constants":19,"../lib/Texture":30,"../objects/abilities/Move":55,"./GameObject":37,"./abilities/Learn":54}],35:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _Texture = require('../lib/Texture');

var _Texture2 = _interopRequireDefault(_Texture);

var _GameObject2 = require('./GameObject');

var _GameObject3 = _interopRequireDefault(_GameObject2);

var _Learn = require('./abilities/Learn');

var _Learn2 = _interopRequireDefault(_Learn);

var _Move = require('../objects/abilities/Move');

var _Move2 = _interopRequireDefault(_Move);

var _KeyMove = require('../objects/abilities/KeyMove');

var _KeyMove2 = _interopRequireDefault(_KeyMove);

var _Camera = require('../objects/abilities/Camera');

var _Camera2 = _interopRequireDefault(_Camera);

var _Carry = require('../objects/abilities/Carry');

var _Carry2 = _interopRequireDefault(_Carry);

var _Place = require('../objects/abilities/Place');

var _Place2 = _interopRequireDefault(_Place);

var _KeyPlace = require('../objects/abilities/KeyPlace');

var _KeyPlace2 = _interopRequireDefault(_KeyPlace);

var _Fire = require('../objects/abilities/Fire');

var _Fire2 = _interopRequireDefault(_Fire);

var _KeyFire = require('../objects/abilities/KeyFire');

var _KeyFire2 = _interopRequireDefault(_KeyFire);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var Cat = function (_GameObject) {
  _inherits(Cat, _GameObject);

  function Cat() {
    _classCallCheck(this, Cat);

    var _this = _possibleConstructorReturn(this, (Cat.__proto__ || Object.getPrototypeOf(Cat)).call(this, _Texture2.default.Rock));

    new _Learn2.default().carryBy(_this).learn(new _Move2.default([2, 0.1])).learn(new _KeyMove2.default()).learn(new _Place2.default()).learn(new _KeyPlace2.default()).learn(new _Camera2.default(1)).learn(new _Carry2.default(3)).learn(new _Fire2.default([3, 3])).learn(new _KeyFire2.default());
    return _this;
  }

  _createClass(Cat, [{
    key: 'toString',
    value: function toString() {
      return 'you';
    }
  }, {
    key: 'tick',
    value: function tick(delta) {
      var _this2 = this;

      Object.values(this.tickAbilities).forEach(function (ability) {
        return ability.tick(delta, _this2);
      });
    }
  }]);

  return Cat;
}(_GameObject3.default);

exports.default = Cat;

},{"../lib/Texture":30,"../objects/abilities/Camera":48,"../objects/abilities/Carry":49,"../objects/abilities/Fire":50,"../objects/abilities/KeyFire":51,"../objects/abilities/KeyMove":52,"../objects/abilities/KeyPlace":53,"../objects/abilities/Move":55,"../objects/abilities/Place":57,"./GameObject":37,"./abilities/Learn":54}],36:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _Texture = require('../lib/Texture');

var _Texture2 = _interopRequireDefault(_Texture);

var _GameObject2 = require('./GameObject');

var _GameObject3 = _interopRequireDefault(_GameObject2);

var _constants = require('../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var Door = function (_GameObject) {
  _inherits(Door, _GameObject);

  function Door(map) {
    _classCallCheck(this, Door);

    var _this = _possibleConstructorReturn(this, (Door.__proto__ || Object.getPrototypeOf(Door)).call(this, _Texture2.default.Door));
    // Create the cat sprite


    _this.map = map[0];
    _this.toPosition = map[1];

    _this.on('collide', _this.actionWith.bind(_this));
    return _this;
  }

  _createClass(Door, [{
    key: 'actionWith',
    value: function actionWith(operator) {
      var ability = operator[_constants.ABILITY_OPERATE];
      if (ability) {
        ability(this);
      } else {
        operator.emit('collide', this);
      }
    }
  }, {
    key: _constants.ABILITY_OPERATE,
    value: function value() {
      this.say(['Get in ', this.map, ' now.'].join(''));
      this.emit('use');
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'Door';
    }
  }, {
    key: 'type',
    get: function get() {
      return _constants.STAY;
    }
  }]);

  return Door;
}(_GameObject3.default);

exports.default = Door;

},{"../config/constants":19,"../lib/Texture":30,"./GameObject":37}],37:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _PIXI = require('../lib/PIXI');

var _constants = require('../config/constants');

var _Messages = require('../lib/Messages');

var _Messages2 = _interopRequireDefault(_Messages);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var GameObject = function (_Sprite) {
  _inherits(GameObject, _Sprite);

  function GameObject() {
    _classCallCheck(this, GameObject);

    return _possibleConstructorReturn(this, (GameObject.__proto__ || Object.getPrototypeOf(GameObject)).apply(this, arguments));
  }

  _createClass(GameObject, [{
    key: 'say',
    value: function say(msg) {
      _Messages2.default.add(msg);
      console.log(msg);
    }
  }, {
    key: 'type',
    get: function get() {
      return _constants.STATIC;
    }
  }]);

  return GameObject;
}(_PIXI.Sprite);

exports.default = GameObject;

},{"../config/constants":19,"../lib/Messages":27,"../lib/PIXI":28}],38:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _Texture = require('../lib/Texture');

var _Texture2 = _interopRequireDefault(_Texture);

var _GameObject2 = require('./GameObject');

var _GameObject3 = _interopRequireDefault(_GameObject2);

var _constants = require('../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var Grass = function (_GameObject) {
  _inherits(Grass, _GameObject);

  function Grass() {
    _classCallCheck(this, Grass);

    // Create the cat sprite
    return _possibleConstructorReturn(this, (Grass.__proto__ || Object.getPrototypeOf(Grass)).call(this, _Texture2.default.Grass));
  }

  _createClass(Grass, [{
    key: 'type',
    get: function get() {
      return _constants.STATIC;
    }
  }]);

  return Grass;
}(_GameObject3.default);

exports.default = Grass;

},{"../config/constants":19,"../lib/Texture":30,"./GameObject":37}],39:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _Texture = require('../lib/Texture');

var _Texture2 = _interopRequireDefault(_Texture);

var _GameObject2 = require('./GameObject');

var _GameObject3 = _interopRequireDefault(_GameObject2);

var _constants = require('../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var GrassDecorate1 = function (_GameObject) {
  _inherits(GrassDecorate1, _GameObject);

  function GrassDecorate1() {
    _classCallCheck(this, GrassDecorate1);

    return _possibleConstructorReturn(this, (GrassDecorate1.__proto__ || Object.getPrototypeOf(GrassDecorate1)).call(this, _Texture2.default.GrassDecorate1));
  }

  _createClass(GrassDecorate1, [{
    key: 'toString',
    value: function toString() {
      return 'GrassDecorate1';
    }
  }, {
    key: 'type',
    get: function get() {
      return _constants.STATIC;
    }
  }]);

  return GrassDecorate1;
}(_GameObject3.default);

exports.default = GrassDecorate1;

},{"../config/constants":19,"../lib/Texture":30,"./GameObject":37}],40:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _Texture = require('../lib/Texture');

var _Texture2 = _interopRequireDefault(_Texture);

var _GameObject2 = require('./GameObject');

var _GameObject3 = _interopRequireDefault(_GameObject2);

var _constants = require('../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var Ground = function (_GameObject) {
  _inherits(Ground, _GameObject);

  function Ground() {
    _classCallCheck(this, Ground);

    // Create the cat sprite
    return _possibleConstructorReturn(this, (Ground.__proto__ || Object.getPrototypeOf(Ground)).call(this, _Texture2.default.Ground));
  }

  _createClass(Ground, [{
    key: 'toString',
    value: function toString() {
      return 'Ground';
    }
  }, {
    key: 'type',
    get: function get() {
      return _constants.STATIC;
    }
  }]);

  return Ground;
}(_GameObject3.default);

exports.default = Ground;

},{"../config/constants":19,"../lib/Texture":30,"./GameObject":37}],41:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _Texture = require('../lib/Texture');

var _Texture2 = _interopRequireDefault(_Texture);

var _GameObject2 = require('./GameObject');

var _GameObject3 = _interopRequireDefault(_GameObject2);

var _constants = require('../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var IronFence = function (_GameObject) {
  _inherits(IronFence, _GameObject);

  function IronFence(treasures) {
    _classCallCheck(this, IronFence);

    return _possibleConstructorReturn(this, (IronFence.__proto__ || Object.getPrototypeOf(IronFence)).call(this, _Texture2.default.IronFence));
  }

  _createClass(IronFence, [{
    key: 'type',
    get: function get() {
      return _constants.STAY;
    }
  }]);

  return IronFence;
}(_GameObject3.default);

exports.default = IronFence;

},{"../config/constants":19,"../lib/Texture":30,"./GameObject":37}],42:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _Texture = require('../lib/Texture');

var _Texture2 = _interopRequireDefault(_Texture);

var _GameObject2 = require('./GameObject');

var _GameObject3 = _interopRequireDefault(_GameObject2);

var _constants = require('../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var Root = function (_GameObject) {
  _inherits(Root, _GameObject);

  function Root(treasures) {
    _classCallCheck(this, Root);

    // Create the cat sprite
    return _possibleConstructorReturn(this, (Root.__proto__ || Object.getPrototypeOf(Root)).call(this, _Texture2.default.Root));
  }

  _createClass(Root, [{
    key: 'type',
    get: function get() {
      return _constants.STAY;
    }
  }]);

  return Root;
}(_GameObject3.default);

exports.default = Root;

},{"../config/constants":19,"../lib/Texture":30,"./GameObject":37}],43:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _Texture = require('../lib/Texture');

var _Texture2 = _interopRequireDefault(_Texture);

var _Light = require('../lib/Light');

var _Light2 = _interopRequireDefault(_Light);

var _GameObject2 = require('./GameObject');

var _GameObject3 = _interopRequireDefault(_GameObject2);

var _constants = require('../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var Torch = function (_GameObject) {
  _inherits(Torch, _GameObject);

  function Torch() {
    _classCallCheck(this, Torch);

    var _this = _possibleConstructorReturn(this, (Torch.__proto__ || Object.getPrototypeOf(Torch)).call(this, _Texture2.default.Torch));

    var radius = 2;

    _this.on('added', _Light2.default.lightOn.bind(null, _this, radius, 0.95));
    _this.on('removeed', _Light2.default.lightOff.bind(null, _this));
    return _this;
  }

  _createClass(Torch, [{
    key: 'toString',
    value: function toString() {
      return 'torch';
    }
  }, {
    key: 'type',
    get: function get() {
      return _constants.STATIC;
    }
  }]);

  return Torch;
}(_GameObject3.default);

exports.default = Torch;

},{"../config/constants":19,"../lib/Light":24,"../lib/Texture":30,"./GameObject":37}],44:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];var _n = true;var _d = false;var _e = undefined;try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;_e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }return _arr;
  }return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _Texture = require('../lib/Texture');

var _Texture2 = _interopRequireDefault(_Texture);

var _GameObject2 = require('./GameObject');

var _GameObject3 = _interopRequireDefault(_GameObject2);

var _constants = require('../config/constants');

var _utils = require('../lib/utils');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

var Slot = function () {
  function Slot(_ref) {
    var _ref2 = _slicedToArray(_ref, 3),
        itemId = _ref2[0],
        params = _ref2[1],
        count = _ref2[2];

    _classCallCheck(this, Slot);

    this.item = (0, _utils.instanceByItemId)(itemId, params);
    this.count = count;
  }

  _createClass(Slot, [{
    key: 'toString',
    value: function toString() {
      return [this.item.toString(), '(', this.count, ')'].join('');
    }
  }]);

  return Slot;
}();

var Treasure = function (_GameObject) {
  _inherits(Treasure, _GameObject);

  function Treasure() {
    var inventories = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

    _classCallCheck(this, Treasure);

    var _this = _possibleConstructorReturn(this, (Treasure.__proto__ || Object.getPrototypeOf(Treasure)).call(this, _Texture2.default.Treasure));
    // Create the cat sprite


    _this.inventories = inventories.map(function (treasure) {
      return new Slot(treasure);
    });

    _this.on('collide', _this.actionWith.bind(_this));
    return _this;
  }

  _createClass(Treasure, [{
    key: 'actionWith',
    value: function actionWith(operator) {
      var carryAbility = operator[_constants.ABILITY_CARRY];
      if (!carryAbility) {
        operator.say('I can\'t carry items not yet.');
        return;
      }

      this.inventories.forEach(function (treasure) {
        return carryAbility.take(treasure.item, treasure.count);
      });
      operator.say(['I taked ', this.toString()].join(''));

      this.parent.removeChild(this);
      this.destroy();
    }
  }, {
    key: 'toString',
    value: function toString() {
      return ['treasure: [', this.inventories.join(', '), ']'].join('');
    }
  }, {
    key: 'type',
    get: function get() {
      return _constants.REPLY;
    }
  }]);

  return Treasure;
}(_GameObject3.default);

exports.default = Treasure;

},{"../config/constants":19,"../lib/Texture":30,"../lib/utils":32,"./GameObject":37}],45:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _Texture = require('../lib/Texture');

var _Texture2 = _interopRequireDefault(_Texture);

var _GameObject2 = require('./GameObject');

var _GameObject3 = _interopRequireDefault(_GameObject2);

var _constants = require('../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var Tree = function (_GameObject) {
  _inherits(Tree, _GameObject);

  function Tree() {
    _classCallCheck(this, Tree);

    return _possibleConstructorReturn(this, (Tree.__proto__ || Object.getPrototypeOf(Tree)).call(this, _Texture2.default.Tree));
  }

  _createClass(Tree, [{
    key: 'type',
    get: function get() {
      return _constants.STAY;
    }
  }]);

  return Tree;
}(_GameObject3.default);

exports.default = Tree;

},{"../config/constants":19,"../lib/Texture":30,"./GameObject":37}],46:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _Texture = require('../lib/Texture');

var _Texture2 = _interopRequireDefault(_Texture);

var _GameObject2 = require('./GameObject');

var _GameObject3 = _interopRequireDefault(_GameObject2);

var _constants = require('../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var Wall = function (_GameObject) {
  _inherits(Wall, _GameObject);

  function Wall(treasures) {
    _classCallCheck(this, Wall);

    var _this = _possibleConstructorReturn(this, (Wall.__proto__ || Object.getPrototypeOf(Wall)).call(this, _Texture2.default.Wall));
    // Create the cat sprite


    _this.on('collide', _this.actionWith.bind(_this));
    return _this;
  }

  _createClass(Wall, [{
    key: 'actionWith',
    value: function actionWith(operator) {
      operator.emit('collide', this);
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'Wall';
    }
  }, {
    key: 'type',
    get: function get() {
      return _constants.STAY;
    }
  }]);

  return Wall;
}(_GameObject3.default);

exports.default = Wall;

},{"../config/constants":19,"../lib/Texture":30,"./GameObject":37}],47:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

var type = Symbol('ability');

var Ability = function () {
  function Ability() {
    _classCallCheck(this, Ability);
  }

  _createClass(Ability, [{
    key: 'getSameTypeAbility',
    value: function getSameTypeAbility(owner) {
      return owner.abilities[this.type];
    }

    // 是否需置換

  }, {
    key: 'hasToReplace',
    value: function hasToReplace(owner, abilityNew) {
      var abilityOld = this.getSameTypeAbility(owner);
      return !abilityOld || abilityNew.isBetter(abilityOld);
    }

    // 新舊比較

  }, {
    key: 'isBetter',
    value: function isBetter(other) {
      return true;
    }

    // 配備此技能

  }, {
    key: 'carryBy',
    value: function carryBy(owner) {
      var abilityOld = this.getSameTypeAbility(owner);
      if (abilityOld) {
        // first get this type ability
        abilityOld.replacedBy(this, owner);
      }
      owner.abilities[this.type] = this;
    }
  }, {
    key: 'replacedBy',
    value: function replacedBy(other, owner) {}
  }, {
    key: 'dropBy',
    value: function dropBy(owner) {
      delete owner.abilities[this.type];
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'plz extend this class';
    }
  }, {
    key: 'serialize',
    value: function serialize() {
      return {};
    }
  }, {
    key: 'type',
    get: function get() {
      return type;
    }
  }]);

  return Ability;
}();

exports.default = Ability;

},{}],48:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;var desc = Object.getOwnPropertyDescriptor(object, property);if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;if (getter === undefined) {
      return undefined;
    }return getter.call(receiver);
  }
};

var _Ability2 = require('./Ability');

var _Ability3 = _interopRequireDefault(_Ability2);

var _Light = require('../../lib/Light');

var _Light2 = _interopRequireDefault(_Light);

var _constants = require('../../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var Camera = function (_Ability) {
  _inherits(Camera, _Ability);

  function Camera(value) {
    _classCallCheck(this, Camera);

    var _this = _possibleConstructorReturn(this, (Camera.__proto__ || Object.getPrototypeOf(Camera)).call(this));

    _this.radius = value;
    return _this;
  }

  _createClass(Camera, [{
    key: 'isBetter',
    value: function isBetter(other) {
      // 只會變大
      return this.radius >= other.radius;
    }

    // 配備此技能

  }, {
    key: 'carryBy',
    value: function carryBy(owner) {
      var _this2 = this;

      _get(Camera.prototype.__proto__ || Object.getPrototypeOf(Camera.prototype), 'carryBy', this).call(this, owner);
      if (owner.parent) {
        this.setup(owner, owner.parent);
      } else {
        owner.once('added', function (container) {
          return _this2.setup(owner, container);
        });
      }
    }
  }, {
    key: 'replacedBy',
    value: function replacedBy(other, owner) {
      this.dropBy(owner);
    }
  }, {
    key: 'setup',
    value: function setup(owner, container) {
      _Light2.default.lightOn(owner, this.radius);
      // 如果 owner 不被顯示
      owner.removed = this.onRemoved.bind(this, owner);
      owner.once('removed', owner.removed);
    }
  }, {
    key: 'onRemoved',
    value: function onRemoved(owner) {
      var _this3 = this;

      this.dropBy(owner);
      // owner 重新被顯示
      owner.once('added', function (container) {
        return _this3.setup(owner, container);
      });
    }
  }, {
    key: 'dropBy',
    value: function dropBy(owner) {
      _Light2.default.lightOff(owner);
      // remove listener
      owner.off('removed', owner.removed);
      delete owner.removed;
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'light area: ' + this.radius;
    }
  }, {
    key: 'type',
    get: function get() {
      return _constants.ABILITY_CAMERA;
    }
  }]);

  return Camera;
}(_Ability3.default);

exports.default = Camera;

},{"../../config/constants":19,"../../lib/Light":24,"./Ability":47}],49:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;var desc = Object.getOwnPropertyDescriptor(object, property);if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;if (getter === undefined) {
      return undefined;
    }return getter.call(receiver);
  }
};

var _Ability2 = require('./Ability');

var _Ability3 = _interopRequireDefault(_Ability2);

var _constants = require('../../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

function newSlot(item, count) {
  return {
    item: item,
    count: count,
    toString: function toString() {
      return [item.toString(), '(', this.count, ')'].join('');
    }
  };
}

var Carry = function (_Ability) {
  _inherits(Carry, _Ability);

  function Carry(initSlots) {
    _classCallCheck(this, Carry);

    var _this = _possibleConstructorReturn(this, (Carry.__proto__ || Object.getPrototypeOf(Carry)).call(this));

    _this.bags = [];
    _this.bags.push(Array(initSlots).fill());
    return _this;
  }

  _createClass(Carry, [{
    key: 'carryBy',
    value: function carryBy(owner) {
      _get(Carry.prototype.__proto__ || Object.getPrototypeOf(Carry.prototype), 'carryBy', this).call(this, owner);
      this.owner = owner;
      owner[_constants.ABILITY_CARRY] = this;
    }
  }, {
    key: 'take',
    value: function take(item) {
      var count = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

      var owner = this.owner;
      if (item instanceof _Ability3.default && owner[_constants.ABILITY_LEARN]) {
        // 取得能力
        owner[_constants.ABILITY_LEARN].learn(item);
        return;
      }
      var key = item.toString();
      var firstEmptySlot = void 0;
      var found = this.bags.some(function (bag, bi) {
        return bag.some(function (slot, si) {
          // 第一個空格
          if (!slot && !firstEmptySlot) {
            firstEmptySlot = { si: si, bi: bi };
          }
          // 物品疊加(同類型)
          if (slot && slot.item.toString() === key) {
            slot.count += count;
            return true;
          }
          return false;
        });
      });
      if (!found) {
        if (!firstEmptySlot) {
          // 沒有空格可放物品
          owner.say('no empty slot for new item got.');
          return;
        }
        this.bags[firstEmptySlot.bi][firstEmptySlot.si] = newSlot(item, count);
      }
      owner.emit('inventory-modified', item);
    }
  }, {
    key: 'getSlotItem',
    value: function getSlotItem(slotInx) {
      var bi = void 0;
      var si = void 0;
      // 照著包包加入順序查找
      var found = this.bags.find(function (bag, b) {
        bi = b;
        return bag.find(function (slot, s) {
          si = s;
          return slotInx-- === 0;
        });
      });
      var item = void 0;
      if (found) {
        found = this.bags[bi][si];
        item = found.item;
        // 取出後減一
        if (--found.count === 0) {
          this.bags[bi][si] = undefined;
        }
        this.owner.emit('inventory-modified', item);
      }
      return item;
    }
  }, {
    key: 'getItemByType',
    value: function getItemByType(type) {
      var bi = void 0;
      var si = void 0;
      var found = this.bags.find(function (bag, b) {
        bi = b;
        return bag.find(function (slot, s) {
          si = s;
          return slot && slot.item instanceof type;
        });
      });
      var item = void 0;
      if (found) {
        found = this.bags[bi][si];
        item = found.item;
        // 取出後減一
        if (--found.count === 0) {
          this.bags[bi][si] = undefined;
        }
        this.owner.emit('inventory-modified', item);
      }
      return item;
    }
  }, {
    key: 'toString',
    value: function toString() {
      return ['carry: ', this.bags.join(', ')].join('');
    }

    // TODO: save data

  }, {
    key: 'serialize',
    value: function serialize() {
      return this.bags;
    }
  }, {
    key: 'type',
    get: function get() {
      return _constants.ABILITY_CARRY;
    }
  }]);

  return Carry;
}(_Ability3.default);

exports.default = Carry;

},{"../../config/constants":19,"./Ability":47}],50:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];var _n = true;var _d = false;var _e = undefined;try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;_e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }return _arr;
  }return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;var desc = Object.getOwnPropertyDescriptor(object, property);if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;if (getter === undefined) {
      return undefined;
    }return getter.call(receiver);
  }
};

var _Ability2 = require('./Ability');

var _Ability3 = _interopRequireDefault(_Ability2);

var _constants = require('../../config/constants');

var _Bullet = require('../Bullet');

var _Bullet2 = _interopRequireDefault(_Bullet);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var MOUSEMOVE = Symbol('mousemove');

var Fire = function (_Ability) {
  _inherits(Fire, _Ability);

  function Fire(_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        speed = _ref2[0],
        power = _ref2[1];

    _classCallCheck(this, Fire);

    var _this = _possibleConstructorReturn(this, (Fire.__proto__ || Object.getPrototypeOf(Fire)).call(this));

    _this.speed = speed;
    // TODO: implement
    _this.power = power;
    return _this;
  }

  _createClass(Fire, [{
    key: 'carryBy',
    value: function carryBy(owner) {
      var _this2 = this;

      _get(Fire.prototype.__proto__ || Object.getPrototypeOf(Fire.prototype), 'carryBy', this).call(this, owner);
      this.owner = owner;
      owner[_constants.ABILITY_FIRE] = this;
      owner.interactive = true;
      owner[MOUSEMOVE] = function (e) {
        _this2.targetPosition = e.data.getLocalPosition(owner);
      };
      owner.on('mousemove', owner[MOUSEMOVE]);
    }
  }, {
    key: 'fire',
    value: function fire() {
      var owner = this.owner;
      var scale = owner.scale.x;

      var carryAbility = owner[_constants.ABILITY_CARRY];
      var BulletType = carryAbility.getItemByType(_Bullet2.default);
      if (!BulletType) {
        // no more bullet in inventory
        console.log('no more bullet in inventory');
        return;
      }
      var bullet = new BulletType.constructor(this.speed);

      bullet.position.set(owner.x + owner.width / 2, owner.y + owner.height / 2);
      bullet.scale.set(scale, scale);
      bullet.setDirection(this.targetPosition);

      owner.emit('fire', bullet);
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'place';
    }
  }, {
    key: 'type',
    get: function get() {
      return _constants.ABILITY_FIRE;
    }
  }]);

  return Fire;
}(_Ability3.default);

exports.default = Fire;

},{"../../config/constants":19,"../Bullet":34,"./Ability":47}],51:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;var desc = Object.getOwnPropertyDescriptor(object, property);if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;if (getter === undefined) {
      return undefined;
    }return getter.call(receiver);
  }
};

var _Ability2 = require('./Ability');

var _Ability3 = _interopRequireDefault(_Ability2);

var _constants = require('../../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
} /* global addEventListener, removeEventListener */

var KeyFire = function (_Ability) {
  _inherits(KeyFire, _Ability);

  function KeyFire() {
    _classCallCheck(this, KeyFire);

    return _possibleConstructorReturn(this, (KeyFire.__proto__ || Object.getPrototypeOf(KeyFire)).apply(this, arguments));
  }

  _createClass(KeyFire, [{
    key: 'isBetter',
    value: function isBetter(other) {
      return false;
    }

    // 配備此技能

  }, {
    key: 'carryBy',
    value: function carryBy(owner) {
      _get(KeyFire.prototype.__proto__ || Object.getPrototypeOf(KeyFire.prototype), 'carryBy', this).call(this, owner);
      this.setup(owner);
    }
  }, {
    key: 'setup',
    value: function setup(owner) {
      var fireAbility = owner[_constants.ABILITY_FIRE];
      var bind = function bind() {
        var handler = function handler(e) {
          fireAbility.fire();
        };
        addEventListener('click', handler);
        return handler;
      };

      owner[_constants.ABILITY_KEY_FIRE] = bind();
    }
  }, {
    key: 'dropBy',
    value: function dropBy(owner) {
      _get(KeyFire.prototype.__proto__ || Object.getPrototypeOf(KeyFire.prototype), 'dropBy', this).call(this, owner);
      removeEventListener('click', owner[_constants.ABILITY_KEY_FIRE]);
      delete owner[_constants.ABILITY_KEY_FIRE];
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'key fire';
    }
  }, {
    key: 'type',
    get: function get() {
      return _constants.ABILITY_KEY_FIRE;
    }
  }]);

  return KeyFire;
}(_Ability3.default);

exports.default = KeyFire;

},{"../../config/constants":19,"./Ability":47}],52:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];var _n = true;var _d = false;var _e = undefined;try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;_e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }return _arr;
  }return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;var desc = Object.getOwnPropertyDescriptor(object, property);if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;if (getter === undefined) {
      return undefined;
    }return getter.call(receiver);
  }
};

var _Ability2 = require('./Ability');

var _Ability3 = _interopRequireDefault(_Ability2);

var _keyboardjs = require('keyboardjs');

var _keyboardjs2 = _interopRequireDefault(_keyboardjs);

var _control = require('../../config/control');

var _constants = require('../../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true });
  } else {
    obj[key] = value;
  }return obj;
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var KeyMove = function (_Ability) {
  _inherits(KeyMove, _Ability);

  function KeyMove() {
    _classCallCheck(this, KeyMove);

    return _possibleConstructorReturn(this, (KeyMove.__proto__ || Object.getPrototypeOf(KeyMove)).apply(this, arguments));
  }

  _createClass(KeyMove, [{
    key: 'isBetter',
    value: function isBetter(other) {
      return false;
    }

    // 配備此技能

  }, {
    key: 'carryBy',
    value: function carryBy(owner) {
      _get(KeyMove.prototype.__proto__ || Object.getPrototypeOf(KeyMove.prototype), 'carryBy', this).call(this, owner);
      this.setup(owner);
    }
  }, {
    key: 'setup',
    value: function setup(owner) {
      var dir = {};
      var calcDir = function calcDir() {
        owner[_constants.ABILITY_MOVE].setDirection({
          x: -dir[_control.LEFT] + dir[_control.RIGHT],
          y: -dir[_control.UP] + dir[_control.DOWN]
        });
      };
      var bind = function bind(code) {
        dir[code] = 0;
        var preHandler = function preHandler(e) {
          e.preventRepeat();
          dir[code] = 1;
          owner[_constants.ABILITY_MOVE].clearPath();
        };
        _keyboardjs2.default.bind(code, preHandler, function () {
          dir[code] = 0;
        });
        return preHandler;
      };

      _keyboardjs2.default.setContext('');
      _keyboardjs2.default.withContext('', function () {
        var _owner$ABILITY_KEY_MO;

        owner[_constants.ABILITY_KEY_MOVE] = (_owner$ABILITY_KEY_MO = {}, _defineProperty(_owner$ABILITY_KEY_MO, _control.LEFT, bind(_control.LEFT)), _defineProperty(_owner$ABILITY_KEY_MO, _control.UP, bind(_control.UP)), _defineProperty(_owner$ABILITY_KEY_MO, _control.RIGHT, bind(_control.RIGHT)), _defineProperty(_owner$ABILITY_KEY_MO, _control.DOWN, bind(_control.DOWN)), _owner$ABILITY_KEY_MO);
      });

      this.timer = setInterval(calcDir, 17);
    }
  }, {
    key: 'dropBy',
    value: function dropBy(owner) {
      _get(KeyMove.prototype.__proto__ || Object.getPrototypeOf(KeyMove.prototype), 'dropBy', this).call(this, owner);
      _keyboardjs2.default.withContext('', function () {
        Object.entries(owner[_constants.ABILITY_KEY_MOVE]).forEach(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2),
              key = _ref2[0],
              handler = _ref2[1];

          _keyboardjs2.default.unbind(key, handler);
        });
      });
      delete owner[_constants.ABILITY_KEY_MOVE];

      clearInterval(this.timer);
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'key control';
    }
  }, {
    key: 'type',
    get: function get() {
      return _constants.ABILITY_KEY_MOVE;
    }
  }]);

  return KeyMove;
}(_Ability3.default);

exports.default = KeyMove;

},{"../../config/constants":19,"../../config/control":20,"./Ability":47,"keyboardjs":2}],53:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];var _n = true;var _d = false;var _e = undefined;try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;_e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }return _arr;
  }return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;var desc = Object.getOwnPropertyDescriptor(object, property);if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;if (getter === undefined) {
      return undefined;
    }return getter.call(receiver);
  }
};

var _Ability2 = require('./Ability');

var _Ability3 = _interopRequireDefault(_Ability2);

var _keyboardjs = require('keyboardjs');

var _keyboardjs2 = _interopRequireDefault(_keyboardjs);

var _control = require('../../config/control');

var _constants = require('../../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var SLOTS = [_control.PLACE1, _control.PLACE2, _control.PLACE3, _control.PLACE4];

var KeyPlace = function (_Ability) {
  _inherits(KeyPlace, _Ability);

  function KeyPlace() {
    _classCallCheck(this, KeyPlace);

    return _possibleConstructorReturn(this, (KeyPlace.__proto__ || Object.getPrototypeOf(KeyPlace)).apply(this, arguments));
  }

  _createClass(KeyPlace, [{
    key: 'isBetter',
    value: function isBetter(other) {
      return false;
    }

    // 配備此技能

  }, {
    key: 'carryBy',
    value: function carryBy(owner) {
      _get(KeyPlace.prototype.__proto__ || Object.getPrototypeOf(KeyPlace.prototype), 'carryBy', this).call(this, owner);
      this.setup(owner);
    }
  }, {
    key: 'setup',
    value: function setup(owner) {
      var placeAbility = owner[_constants.ABILITY_PLACE];
      var bind = function bind(key) {
        var slotInx = SLOTS.indexOf(key);
        var handler = function handler(e) {
          e.preventRepeat();
          placeAbility.place(slotInx);
        };
        _keyboardjs2.default.bind(key, handler, function () {});
        return handler;
      };

      _keyboardjs2.default.setContext('');
      _keyboardjs2.default.withContext('', function () {
        owner[_constants.ABILITY_KEY_PLACE] = {
          PLACE1: bind(_control.PLACE1),
          PLACE2: bind(_control.PLACE2),
          PLACE3: bind(_control.PLACE3),
          PLACE4: bind(_control.PLACE4)
        };
      });
    }
  }, {
    key: 'dropBy',
    value: function dropBy(owner) {
      _get(KeyPlace.prototype.__proto__ || Object.getPrototypeOf(KeyPlace.prototype), 'dropBy', this).call(this, owner);
      _keyboardjs2.default.withContext('', function () {
        Object.entries(owner[_constants.ABILITY_KEY_PLACE]).forEach(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2),
              key = _ref2[0],
              handler = _ref2[1];

          _keyboardjs2.default.unbind(key, handler);
        });
      });
      delete owner[_constants.ABILITY_KEY_PLACE];
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'key place';
    }
  }, {
    key: 'type',
    get: function get() {
      return _constants.ABILITY_KEY_PLACE;
    }
  }]);

  return KeyPlace;
}(_Ability3.default);

exports.default = KeyPlace;

},{"../../config/constants":19,"../../config/control":20,"./Ability":47,"keyboardjs":2}],54:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;var desc = Object.getOwnPropertyDescriptor(object, property);if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;if (getter === undefined) {
      return undefined;
    }return getter.call(receiver);
  }
};

var _Ability2 = require('./Ability');

var _Ability3 = _interopRequireDefault(_Ability2);

var _constants = require('../../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var Learn = function (_Ability) {
  _inherits(Learn, _Ability);

  function Learn() {
    _classCallCheck(this, Learn);

    return _possibleConstructorReturn(this, (Learn.__proto__ || Object.getPrototypeOf(Learn)).apply(this, arguments));
  }

  _createClass(Learn, [{
    key: 'isBetter',
    value: function isBetter(other) {
      return false;
    }
  }, {
    key: 'carryBy',
    value: function carryBy(owner) {
      if (!owner.abilities) {
        owner.abilities = {};
        owner.tickAbilities = {};
      }
      _get(Learn.prototype.__proto__ || Object.getPrototypeOf(Learn.prototype), 'carryBy', this).call(this, owner);
      this.owner = owner;
      owner[_constants.ABILITY_LEARN] = this;
      return this;
    }
  }, {
    key: 'learn',
    value: function learn(ability) {
      var owner = this.owner;
      if (ability.hasToReplace(owner, ability)) {
        ability.carryBy(owner);
        owner.emit('ability-carry', ability);
      }
      return owner[_constants.ABILITY_LEARN];
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'learning';
    }
  }, {
    key: 'type',
    get: function get() {
      return _constants.ABILITY_LEARN;
    }
  }]);

  return Learn;
}(_Ability3.default);

exports.default = Learn;

},{"../../config/constants":19,"./Ability":47}],55:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];var _n = true;var _d = false;var _e = undefined;try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;_e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }return _arr;
  }return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;var desc = Object.getOwnPropertyDescriptor(object, property);if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;if (getter === undefined) {
      return undefined;
    }return getter.call(receiver);
  }
};

var _Ability2 = require('./Ability');

var _Ability3 = _interopRequireDefault(_Ability2);

var _constants = require('../../config/constants');

var _Vector = require('../../lib/Vector');

var _Vector2 = _interopRequireDefault(_Vector);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var DISTANCE_THRESHOLD = 1;

var Move = function (_Ability) {
  _inherits(Move, _Ability);

  /**
   * 移動能力
   * @param  {int} value    移動速度
   * @param  {Number} friction 摩擦力(1: 最大，0: 最小)
   */
  function Move(_ref) {
    var _ref2 = _slicedToArray(_ref, 2),
        value = _ref2[0],
        friction = _ref2[1];

    _classCallCheck(this, Move);

    var _this = _possibleConstructorReturn(this, (Move.__proto__ || Object.getPrototypeOf(Move)).call(this));

    _this.value = value;
    _this.vector = new _Vector2.default(0, 0);
    _this.friction = friction;
    _this.path = [];
    _this.movingToPoint = undefined;
    _this.distanceThreshold = _this.value * DISTANCE_THRESHOLD;
    return _this;
  }

  _createClass(Move, [{
    key: 'isBetter',
    value: function isBetter(other) {
      // 只會加快
      return this.value > other.value;
    }

    // 配備此技能

  }, {
    key: 'carryBy',
    value: function carryBy(owner) {
      _get(Move.prototype.__proto__ || Object.getPrototypeOf(Move.prototype), 'carryBy', this).call(this, owner);
      this.owner = owner;
      owner[_constants.ABILITY_MOVE] = this;
      owner.tickAbilities[this.type.toString()] = this;
    }
  }, {
    key: 'replacedBy',
    value: function replacedBy(other, owner) {
      other.vector = this.vector;
      other.path = this.path;
      other.movingToPoint = this.movingToPoint;
    }

    // @point 相對於 owner 的點

  }, {
    key: 'setDirection',
    value: function setDirection(point) {
      var vector = _Vector2.default.fromPoint(point);
      var len = vector.length;
      if (len === 0) {
        return;
      }
      this.vector = vector.setLength(this.value);
    }

    // 移動到點

  }, {
    key: 'moveTo',
    value: function moveTo(point) {
      this.setDirection({
        x: point.x - this.owner.x,
        y: point.y - this.owner.y
      });
    }

    // 設定移動路徑

  }, {
    key: 'setPath',
    value: function setPath(path) {
      if (path.length === 0) {
        // 抵達終點
        this.movingToPoint = undefined;
        this.vector = new _Vector2.default(0, 0);
        return;
      }
      this.path = path;
      this.movingToPoint = path.pop();
      this.moveTo(this.movingToPoint);
    }
  }, {
    key: 'clearPath',
    value: function clearPath() {
      this.movingToPoint = undefined;
      this.path = [];
    }
  }, {
    key: 'addPath',
    value: function addPath(path) {
      this.setPath(path.concat(this.path));
    }

    // tick

  }, {
    key: 'tick',
    value: function tick(delta, owner) {
      // NOTICE: 假設自己是正方形
      var scale = owner.scale.x;
      var vector = this.vector;
      var maxValue = this.value;

      // 不可超出最高速度
      if (this.vector.length > maxValue) {
        this.vector.setLength(maxValue);
      }

      // 摩擦力
      this.vector.add(this.vector.clone().invert().multiplyScalar(this.friction));

      owner.x += vector.x * this.value * scale * delta;
      owner.y += vector.y * this.value * scale * delta;

      if (this.movingToPoint) {
        var position = owner.position;
        var targetPosition = this.movingToPoint;
        var a = position.x - targetPosition.x;
        var b = position.y - targetPosition.y;
        var c = Math.sqrt(a * a + b * b);
        if (c < this.distanceThreshold) {
          this.setPath(this.path);
        } else {
          this.moveTo(this.movingToPoint);
        }
      }
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'move level: ' + this.value;
    }
  }, {
    key: 'type',
    get: function get() {
      return _constants.ABILITY_MOVE;
    }
  }]);

  return Move;
}(_Ability3.default);

exports.default = Move;

},{"../../config/constants":19,"../../lib/Vector":31,"./Ability":47}],56:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;var desc = Object.getOwnPropertyDescriptor(object, property);if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;if (getter === undefined) {
      return undefined;
    }return getter.call(receiver);
  }
};

var _Ability2 = require('./Ability');

var _Ability3 = _interopRequireDefault(_Ability2);

var _constants = require('../../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var Operate = function (_Ability) {
  _inherits(Operate, _Ability);

  function Operate(value) {
    _classCallCheck(this, Operate);

    var _this = _possibleConstructorReturn(this, (Operate.__proto__ || Object.getPrototypeOf(Operate)).call(this));

    _this.set = new Set([value]);
    return _this;
  }

  _createClass(Operate, [{
    key: 'carryBy',
    value: function carryBy(owner) {
      _get(Operate.prototype.__proto__ || Object.getPrototypeOf(Operate.prototype), 'carryBy', this).call(this, owner);
      owner[_constants.ABILITY_OPERATE] = this[_constants.ABILITY_OPERATE].bind(this, owner);
      return owner[_constants.ABILITY_OPERATE];
    }
  }, {
    key: 'replacedBy',
    value: function replacedBy(other) {
      this.set.forEach(other.set.add.bind(other.set));
    }
  }, {
    key: _constants.ABILITY_OPERATE,
    value: function value(operator, target) {
      if (this.set.has(target.map)) {
        operator.say(operator.toString() + ' use ability to open ' + target.map);
        target[this.type]();
      }
    }
  }, {
    key: 'toString',
    value: function toString() {
      return ['keys: ', Array.from(this.set).join(', ')].join('');
    }
  }, {
    key: 'type',
    get: function get() {
      return _constants.ABILITY_OPERATE;
    }
  }]);

  return Operate;
}(_Ability3.default);

exports.default = Operate;

},{"../../config/constants":19,"./Ability":47}],57:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;var desc = Object.getOwnPropertyDescriptor(object, property);if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;if (getter === undefined) {
      return undefined;
    }return getter.call(receiver);
  }
};

var _Ability2 = require('./Ability');

var _Ability3 = _interopRequireDefault(_Ability2);

var _constants = require('../../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var Place = function (_Ability) {
  _inherits(Place, _Ability);

  function Place() {
    _classCallCheck(this, Place);

    return _possibleConstructorReturn(this, (Place.__proto__ || Object.getPrototypeOf(Place)).apply(this, arguments));
  }

  _createClass(Place, [{
    key: 'carryBy',
    value: function carryBy(owner) {
      _get(Place.prototype.__proto__ || Object.getPrototypeOf(Place.prototype), 'carryBy', this).call(this, owner);
      this.owner = owner;
      owner[_constants.ABILITY_PLACE] = this;
    }
  }, {
    key: 'place',
    value: function place(slotInx) {
      var owner = this.owner;
      var carryAbility = owner[_constants.ABILITY_CARRY];
      var item = carryAbility.getSlotItem(slotInx);
      if (item) {
        owner.emit('place', new item.constructor());

        var position = owner.position;
        owner.say(['place ', item.toString(), ' at ', ['(', position.x.toFixed(0), ', ', position.y.toFixed(0), ')'].join('')].join(''));
      }
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'place';
    }
  }, {
    key: 'type',
    get: function get() {
      return _constants.ABILITY_PLACE;
    }
  }]);

  return Place;
}(_Ability3.default);

exports.default = Place;

},{"../../config/constants":19,"./Ability":47}],58:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _PIXI = require('../lib/PIXI');

var _Scene2 = require('../lib/Scene');

var _Scene3 = _interopRequireDefault(_Scene2);

var _PlayScene = require('./PlayScene');

var _PlayScene2 = _interopRequireDefault(_PlayScene);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var text = 'loading';

var LoadingScene = function (_Scene) {
  _inherits(LoadingScene, _Scene);

  function LoadingScene() {
    _classCallCheck(this, LoadingScene);

    var _this = _possibleConstructorReturn(this, (LoadingScene.__proto__ || Object.getPrototypeOf(LoadingScene)).call(this));

    _this.life = 0;
    return _this;
  }

  _createClass(LoadingScene, [{
    key: 'create',
    value: function create() {
      var _this2 = this;

      var style = new _PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 36,
        fill: 'white',
        stroke: '#ff3300',
        strokeThickness: 4,
        dropShadow: true,
        dropShadowColor: '#000000',
        dropShadowBlur: 4,
        dropShadowAngle: Math.PI / 6,
        dropShadowDistance: 6
      });
      this.textLoading = new _PIXI.Text(text, style);

      // Add the cat to the stage
      this.addChild(this.textLoading);

      // load an image and run the `setup` function when it's done
      _PIXI.loader.add('images/terrain_atlas.json').add('images/base_out_atlas.json').load(function () {
        return _this2.emit('changeScene', _PlayScene2.default, {
          mapFile: 'E0N0',
          position: [4, 1]
        });
      });
    }
  }, {
    key: 'tick',
    value: function tick(delta) {
      this.life += delta / 30; // blend speed
      this.textLoading.text = text + Array(Math.floor(this.life) % 4 + 1).join('.');
    }
  }]);

  return LoadingScene;
}(_Scene3.default);

exports.default = LoadingScene;

},{"../lib/PIXI":28,"../lib/Scene":29,"./PlayScene":59}],59:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _PIXI = require('../lib/PIXI');

var _Scene2 = require('../lib/Scene');

var _Scene3 = _interopRequireDefault(_Scene2);

var _Map = require('../lib/Map');

var _Map2 = _interopRequireDefault(_Map);

var _constants = require('../config/constants');

var _Cat = require('../objects/Cat');

var _Cat2 = _interopRequireDefault(_Cat);

var _MessageWindow = require('../ui/MessageWindow');

var _MessageWindow2 = _interopRequireDefault(_MessageWindow);

var _PlayerWindow = require('../ui/PlayerWindow');

var _PlayerWindow2 = _interopRequireDefault(_PlayerWindow);

var _InventoryWindow = require('../ui/InventoryWindow');

var _InventoryWindow2 = _interopRequireDefault(_InventoryWindow);

var _TouchDirectionControlPanel = require('../ui/TouchDirectionControlPanel');

var _TouchDirectionControlPanel2 = _interopRequireDefault(_TouchDirectionControlPanel);

var _TouchOperationControlPanel = require('../ui/TouchOperationControlPanel');

var _TouchOperationControlPanel2 = _interopRequireDefault(_TouchOperationControlPanel);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var sceneWidth = void 0;
var sceneHeight = void 0;

function getMessageWindowOpt() {
  var opt = {};
  if (_constants.IS_MOBILE) {
    opt.width = sceneWidth;
    opt.fontSize = opt.width / 30;
    opt.scrollBarWidth = 50;
    opt.scrollBarMinHeight = 70;
  } else {
    opt.width = sceneWidth < 400 ? sceneWidth : sceneWidth / 2;
    opt.fontSize = opt.width / 60;
  }
  opt.height = sceneHeight / 6;
  opt.x = 0;
  opt.y = sceneHeight - opt.height;

  return opt;
}

function getPlayerWindowOpt(player) {
  var opt = {
    player: player
  };
  opt.x = 0;
  opt.y = 0;
  if (_constants.IS_MOBILE) {
    opt.width = sceneWidth / 4;
    opt.height = sceneHeight / 6;
    opt.fontSize = opt.width / 10;
  } else {
    opt.width = sceneWidth < 400 ? sceneWidth / 2 : sceneWidth / 4;
    opt.height = sceneHeight / 3;
    opt.fontSize = opt.width / 20;
  }
  return opt;
}

function getInventoryWindowOpt(player) {
  var opt = {
    player: player
  };
  opt.y = 0;
  if (_constants.IS_MOBILE) {
    opt.width = sceneWidth / 6;
  } else {
    var divide = sceneWidth < 400 ? 6 : sceneWidth < 800 ? 12 : 20;
    opt.width = sceneWidth / divide;
  }
  opt.x = sceneWidth - opt.width;
  return opt;
}

var PlayScene = function (_Scene) {
  _inherits(PlayScene, _Scene);

  function PlayScene(_ref) {
    var mapFile = _ref.mapFile,
        position = _ref.position;

    _classCallCheck(this, PlayScene);

    var _this = _possibleConstructorReturn(this, (PlayScene.__proto__ || Object.getPrototypeOf(PlayScene)).call(this));

    _this.mapFile = mapFile;
    _this.toPosition = position;
    return _this;
  }

  _createClass(PlayScene, [{
    key: 'create',
    value: function create() {
      sceneWidth = this.parent.width;
      sceneHeight = this.parent.height;
      this.isMapLoaded = false;
      this.loadMap();
      this.initPlayer();
      this.initUi();
    }
  }, {
    key: 'initUi',
    value: function initUi() {
      var uiGroup = new _PIXI.display.Group(0, true);
      var uiLayer = new _PIXI.display.Layer(uiGroup);
      uiLayer.parentLayer = this;
      uiLayer.group.enableSort = true;
      this.addChild(uiLayer);

      var messageWindow = new _MessageWindow2.default(getMessageWindowOpt());
      var playerWindow = new _PlayerWindow2.default(getPlayerWindowOpt(this.cat));
      var inventoryWindow = new _InventoryWindow2.default(getInventoryWindowOpt(this.cat));

      // 讓UI顯示在頂層
      messageWindow.parentGroup = uiGroup;
      playerWindow.parentGroup = uiGroup;
      inventoryWindow.parentGroup = uiGroup;
      uiLayer.addChild(messageWindow);
      uiLayer.addChild(playerWindow);
      uiLayer.addChild(inventoryWindow);

      if (_constants.IS_MOBILE) {
        // 只有手機要觸控板
        // 方向控制
        var directionPanel = new _TouchDirectionControlPanel2.default({
          x: sceneWidth / 4,
          y: sceneHeight * 4 / 6,
          radius: sceneWidth / 10
        });
        directionPanel.parentGroup = uiGroup;

        // 操作控制
        var operationPanel = new _TouchOperationControlPanel2.default({
          x: sceneWidth / 4 * 3,
          y: sceneHeight * 4 / 6,
          radius: sceneWidth / 10
        });
        operationPanel.parentGroup = uiGroup;

        uiLayer.addChild(directionPanel);
        uiLayer.addChild(operationPanel);
        // require('../lib/demo')
      }
      messageWindow.add(['scene size: (', sceneWidth, ', ', sceneHeight, ').'].join(''));
    }
  }, {
    key: 'initPlayer',
    value: function initPlayer() {
      if (!this.cat) {
        this.cat = new _Cat2.default();
      }
    }
  }, {
    key: 'loadMap',
    value: function loadMap() {
      var fileName = 'world/' + this.mapFile;

      // if map not loaded yet
      if (!_PIXI.resources[fileName]) {
        _PIXI.loader.add(fileName, fileName + '.json').load(this.spawnMap.bind(this, fileName));
      } else {
        this.spawnMap(fileName);
      }
    }
  }, {
    key: 'spawnMap',
    value: function spawnMap(fileName) {
      var _this2 = this;

      var mapData = _PIXI.resources[fileName].data;
      var mapScale = _constants.IS_MOBILE ? 2 : 0.5;

      var map = new _Map2.default(mapScale);
      this.addChild(map);
      map.load(mapData);

      map.on('use', function (o) {
        _this2.isMapLoaded = false;
        // clear old map
        _this2.removeChild(_this2.map);
        _this2.map.destroy();

        _this2.mapFile = o.map;
        _this2.toPosition = o.toPosition;
        _this2.loadMap();
      });

      map.addPlayer(this.cat, this.toPosition);
      this.map = map;

      this.isMapLoaded = true;
    }
  }, {
    key: 'tick',
    value: function tick(delta) {
      if (!this.isMapLoaded) {
        return;
      }
      this.map.tick(delta);
      // FIXME: gap between tiles on iPhone Safari
      this.map.position.set(Math.floor(sceneWidth / 2 - this.cat.x), Math.floor(sceneHeight / 2 - this.cat.y));
    }
  }]);

  return PlayScene;
}(_Scene3.default);

exports.default = PlayScene;

},{"../config/constants":19,"../lib/Map":25,"../lib/PIXI":28,"../lib/Scene":29,"../objects/Cat":35,"../ui/InventoryWindow":60,"../ui/MessageWindow":61,"../ui/PlayerWindow":62,"../ui/TouchDirectionControlPanel":64,"../ui/TouchOperationControlPanel":65}],60:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _Window2 = require('./Window');

var _Window3 = _interopRequireDefault(_Window2);

var _PIXI = require('../lib/PIXI');

var _constants = require('../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var Slot = function (_Container) {
  _inherits(Slot, _Container);

  function Slot(_ref) {
    var x = _ref.x,
        y = _ref.y,
        width = _ref.width,
        height = _ref.height;

    _classCallCheck(this, Slot);

    var _this = _possibleConstructorReturn(this, (Slot.__proto__ || Object.getPrototypeOf(Slot)).call(this));

    _this.position.set(x, y);

    var rect = new _PIXI.Graphics();
    rect.beginFill(0xA2A2A2);
    rect.drawRoundedRect(0, 0, width, height, 5);
    rect.endFill();
    _this.addChild(rect);
    return _this;
  }

  _createClass(Slot, [{
    key: 'setContext',
    value: function setContext(item, count) {
      this.clearContext();

      var width = this.width;
      var height = this.height;
      // 置中
      item = new item.constructor();
      item.width = width * 0.8;
      item.height = height * 0.8;
      item.anchor.set(0.5, 0.5);
      item.position.set(width / 2, height / 2);
      this.addChild(item);

      // 數量
      var fontSize = this.width * 0.3;
      var style = new _PIXI.TextStyle({
        fontSize: fontSize,
        fill: 'red',
        fontWeight: '600',
        lineHeight: fontSize
      });
      var text = new _PIXI.Text(count, style);
      text.position.set(width * 0.95, height);
      text.anchor.set(1, 1);
      this.addChild(text);

      this.item = item;
      this.text = text;
    }
  }, {
    key: 'clearContext',
    value: function clearContext() {
      if (this.item) {
        this.item.destroy();
        this.text.destroy();
        delete this.item;
        delete this.text;
      }
    }
  }]);

  return Slot;
}(_PIXI.Container);

var InventoryWindow = function (_Window) {
  _inherits(InventoryWindow, _Window);

  function InventoryWindow(opt) {
    _classCallCheck(this, InventoryWindow);

    var player = opt.player,
        width = opt.width;

    var padding = width * 0.1;
    var ceilSize = width - padding * 2;
    var ceilOpt = {
      x: padding,
      y: padding,
      width: ceilSize,
      height: ceilSize
    };
    var slotCount = 4;
    opt.height = (width - padding) * slotCount + padding;

    var _this2 = _possibleConstructorReturn(this, (InventoryWindow.__proto__ || Object.getPrototypeOf(InventoryWindow)).call(this, opt));

    _this2._opt = opt;
    player.on('inventory-modified', _this2.onInventoryModified.bind(_this2, player));

    _this2.slotContainers = [];
    _this2.slots = [];
    for (var i = 0; i < slotCount; i++) {
      var slot = new Slot(ceilOpt);
      _this2.addChild(slot);
      _this2.slotContainers.push(slot);
      ceilOpt.y += ceilSize + padding;
    }

    _this2.onInventoryModified(player);
    return _this2;
  }

  _createClass(InventoryWindow, [{
    key: 'onInventoryModified',
    value: function onInventoryModified(player) {
      var _this3 = this;

      var carryAbility = player[_constants.ABILITY_CARRY];
      if (!carryAbility) {
        // no inventory yet
        return;
      }
      var i = 0;
      carryAbility.bags.forEach(function (bag) {
        return bag.forEach(function (slot) {
          _this3.slots[i] = slot;
          i++;
        });
      });
      this.slotContainers.forEach(function (container, i) {
        var slot = _this3.slots[i];
        if (slot) {
          container.setContext(slot.item, slot.count);
        } else {
          container.clearContext();
        }
      });
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'window';
    }
  }]);

  return InventoryWindow;
}(_Window3.default);

exports.default = InventoryWindow;

},{"../config/constants":19,"../lib/PIXI":28,"./Window":66}],61:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _PIXI = require('../lib/PIXI');

var _ScrollableWindow2 = require('./ScrollableWindow');

var _ScrollableWindow3 = _interopRequireDefault(_ScrollableWindow2);

var _Messages = require('../lib/Messages');

var _Messages2 = _interopRequireDefault(_Messages);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var MessageWindow = function (_ScrollableWindow) {
  _inherits(MessageWindow, _ScrollableWindow);

  function MessageWindow(opt) {
    _classCallCheck(this, MessageWindow);

    var _this = _possibleConstructorReturn(this, (MessageWindow.__proto__ || Object.getPrototypeOf(MessageWindow)).call(this, opt));

    var _opt$fontSize = opt.fontSize,
        fontSize = _opt$fontSize === undefined ? 12 : _opt$fontSize;

    var style = new _PIXI.TextStyle({
      fontSize: fontSize,
      fill: 'green',
      breakWords: true,
      wordWrap: true,
      wordWrapWidth: _this.windowWidth
    });
    var text = new _PIXI.Text('', style);

    _this.addWindowChild(text);
    _this.text = text;

    _this.autoScrollToBottom = true;

    _Messages2.default.on('modified', _this.modified.bind(_this));
    return _this;
  }

  _createClass(MessageWindow, [{
    key: 'modified',
    value: function modified() {
      var scrollPercent = this.scrollPercent;
      this.text.text = [].concat(_Messages2.default.list).reverse().join('\n');
      this.updateScrollBarLength();

      // 若scroll置底，自動捲動置底
      if (scrollPercent === 1) {
        this.scrollTo(1);
      }
    }
  }, {
    key: 'add',
    value: function add(msg) {
      _Messages2.default.add(msg);
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'message-window';
    }
  }]);

  return MessageWindow;
}(_ScrollableWindow3.default);

exports.default = MessageWindow;

},{"../lib/Messages":27,"../lib/PIXI":28,"./ScrollableWindow":63}],62:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _PIXI = require('../lib/PIXI');

var _Window2 = require('./Window');

var _Window3 = _interopRequireDefault(_Window2);

var _constants = require('../config/constants');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var ABILITIES_ALL = [_constants.ABILITY_MOVE, _constants.ABILITY_CAMERA, _constants.ABILITY_OPERATE, _constants.ABILITY_PLACE];

var PlayerWindow = function (_Window) {
  _inherits(PlayerWindow, _Window);

  function PlayerWindow(opt) {
    _classCallCheck(this, PlayerWindow);

    var _this = _possibleConstructorReturn(this, (PlayerWindow.__proto__ || Object.getPrototypeOf(PlayerWindow)).call(this, opt));

    var player = opt.player;

    _this._opt = opt;
    player.on('ability-carry', _this.onAbilityCarry.bind(_this, player));

    _this.abilityTextContainer = new _PIXI.Container();
    _this.abilityTextContainer.x = 5;
    _this.addChild(_this.abilityTextContainer);

    _this.onAbilityCarry(player);
    return _this;
  }

  _createClass(PlayerWindow, [{
    key: 'onAbilityCarry',
    value: function onAbilityCarry(player) {
      var i = 0;
      var _opt$fontSize = this._opt.fontSize,
          fontSize = _opt$fontSize === undefined ? 10 : _opt$fontSize;

      var style = new _PIXI.TextStyle({
        fontSize: fontSize,
        fill: 'green',
        lineHeight: fontSize
      });

      // 更新面板數據
      var contianer = this.abilityTextContainer;
      contianer.removeChildren();
      ABILITIES_ALL.forEach(function (abilitySymbol) {
        var ability = player.abilities[abilitySymbol];
        if (ability) {
          var text = new _PIXI.Text(ability.toString(), style);
          text.y = i * (fontSize + 5);

          contianer.addChild(text);

          i++;
        }
      });
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'window';
    }
  }]);

  return PlayerWindow;
}(_Window3.default);

exports.default = PlayerWindow;

},{"../config/constants":19,"../lib/PIXI":28,"./Window":66}],63:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _PIXI = require('../lib/PIXI');

var _Window2 = require('./Window');

var _Window3 = _interopRequireDefault(_Window2);

var _Wrapper = require('./Wrapper');

var _Wrapper2 = _interopRequireDefault(_Wrapper);

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var ScrollableWindow = function (_Window) {
  _inherits(ScrollableWindow, _Window);

  function ScrollableWindow(opt) {
    _classCallCheck(this, ScrollableWindow);

    var _this = _possibleConstructorReturn(this, (ScrollableWindow.__proto__ || Object.getPrototypeOf(ScrollableWindow)).call(this, opt));

    var width = opt.width,
        height = opt.height,
        _opt$padding = opt.padding,
        padding = _opt$padding === undefined ? 8 : _opt$padding,
        _opt$scrollBarWidth = opt.scrollBarWidth,
        scrollBarWidth = _opt$scrollBarWidth === undefined ? 10 : _opt$scrollBarWidth;

    _this._opt = opt;

    _this._initScrollableArea(width - padding * 2 - scrollBarWidth - 5, height - padding * 2, padding);
    _this._initScrollBar({
      // window width - window padding - bar width
      x: width - padding - scrollBarWidth,
      y: padding,
      width: scrollBarWidth,
      height: height - padding * 2
    });
    return _this;
  }

  _createClass(ScrollableWindow, [{
    key: '_initScrollableArea',
    value: function _initScrollableArea(width, height, padding) {
      // hold padding
      var _mainView = new _PIXI.Container();
      _mainView.position.set(padding, padding);
      this.addChild(_mainView);

      this.mainView = new _PIXI.Container();
      _mainView.addChild(this.mainView);

      // hide mainView's overflow
      var mask = new _PIXI.Graphics();
      mask.beginFill(0xFFFFFF);
      mask.drawRoundedRect(0, 0, width, height, 5);
      mask.endFill();
      this.mainView.mask = mask;
      _mainView.addChild(mask);

      // window width - window padding * 2 - bar width - between space
      this._windowWidth = width;
      this._windowHeight = height;
    }
  }, {
    key: '_initScrollBar',
    value: function _initScrollBar(_ref) {
      var x = _ref.x,
          y = _ref.y,
          width = _ref.width,
          height = _ref.height;

      var conatiner = new _PIXI.Container();
      conatiner.x = x;
      conatiner.y = y;

      var scrollBarBg = new _PIXI.Graphics();
      scrollBarBg.beginFill(0xA8A8A8);
      scrollBarBg.drawRoundedRect(0, 0, width, height, 2);
      scrollBarBg.endFill();

      var scrollBar = new _PIXI.Graphics();
      scrollBar.beginFill(0x222222);
      scrollBar.drawRoundedRect(0, 0, width, height, 3);
      scrollBar.endFill();
      scrollBar.toString = function () {
        return 'scrollBar';
      };
      _Wrapper2.default.draggable(scrollBar, {
        boundary: {
          x: 0,
          y: 0,
          width: width,
          height: height
        }
      });
      scrollBar.on('drag', this.scrollMainView.bind(this));

      conatiner.addChild(scrollBarBg);
      conatiner.addChild(scrollBar);
      this.addChild(conatiner);
      this.scrollBar = scrollBar;
      this.scrollBarBg = scrollBarBg;
    }

    // 捲動視窗

  }, {
    key: 'scrollMainView',
    value: function scrollMainView() {
      this.mainView.y = (this.windowHeight - this.mainView.height) * this.scrollPercent;
    }

    // 新增物件至視窗

  }, {
    key: 'addWindowChild',
    value: function addWindowChild(child) {
      this.mainView.addChild(child);
    }

    // 更新捲動棒大小, 不一定要調用

  }, {
    key: 'updateScrollBarLength',
    value: function updateScrollBarLength() {
      var _opt$scrollBarMinHeig = this._opt.scrollBarMinHeight,
          scrollBarMinHeight = _opt$scrollBarMinHeig === undefined ? 20 : _opt$scrollBarMinHeig;

      var dh = this.mainView.height / this.windowHeight;
      if (dh < 1) {
        this.scrollBar.height = this.scrollBarBg.height;
      } else {
        this.scrollBar.height = this.scrollBarBg.height / dh;
        // 避免太小很難拖曳
        this.scrollBar.height = Math.max(scrollBarMinHeight, this.scrollBar.height);
      }
      this.scrollBar.fallbackToBoundary();
    }

    // 捲動百分比

  }, {
    key: 'scrollTo',

    // 捲動至百分比
    value: function scrollTo(percent) {
      var delta = this.scrollBarBg.height - this.scrollBar.height;
      var y = 0;
      if (delta !== 0) {
        y = delta * percent;
      }
      this.scrollBar.y = y;
      this.scrollMainView();
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'window';
    }
  }, {
    key: 'scrollPercent',
    get: function get() {
      var delta = this.scrollBarBg.height - this.scrollBar.height;
      return delta === 0 ? 1 : this.scrollBar.y / delta;
    }
  }, {
    key: 'windowWidth',
    get: function get() {
      return this._windowWidth;
    }
  }, {
    key: 'windowHeight',
    get: function get() {
      return this._windowHeight;
    }
  }]);

  return ScrollableWindow;
}(_Window3.default);

exports.default = ScrollableWindow;

},{"../lib/PIXI":28,"./Window":66,"./Wrapper":67}],64:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _PIXI = require('../lib/PIXI');

var _Vector = require('../lib/Vector');

var _Vector2 = _interopRequireDefault(_Vector);

var _keyboardjs = require('keyboardjs');

var _keyboardjs2 = _interopRequireDefault(_keyboardjs);

var _control = require('../config/control');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var ALL_KEYS = [_control.RIGHT, _control.LEFT, _control.UP, _control.DOWN];

var TouchDirectionControlPanel = function (_Container) {
  _inherits(TouchDirectionControlPanel, _Container);

  function TouchDirectionControlPanel(_ref) {
    var x = _ref.x,
        y = _ref.y,
        radius = _ref.radius;

    _classCallCheck(this, TouchDirectionControlPanel);

    var _this = _possibleConstructorReturn(this, (TouchDirectionControlPanel.__proto__ || Object.getPrototypeOf(TouchDirectionControlPanel)).call(this));

    _this.position.set(x, y);

    var touchArea = new _PIXI.Graphics();
    touchArea.beginFill(0xF2F2F2, 0.5);
    touchArea.drawCircle(0, 0, radius);
    touchArea.endFill();
    _this.addChild(touchArea);
    _this.radius = radius;

    _this.setupTouch();
    return _this;
  }

  _createClass(TouchDirectionControlPanel, [{
    key: 'setupTouch',
    value: function setupTouch() {
      this.interactive = true;
      var f = this.onTouch.bind(this);
      this.on('touchstart', f);
      this.on('touchend', f);
      this.on('touchmove', f);
      this.on('touchendoutside', f);
    }
  }, {
    key: 'onTouch',
    value: function onTouch(e) {
      var type = e.type;
      var propagation = false;
      switch (type) {
        case 'touchstart':
          this.drag = e.data.global.clone();
          this.createDragPoint();
          this.originPosition = {
            x: this.x,
            y: this.y
          };
          break;
        case 'touchend':
        case 'touchendoutside':
          if (this.drag) {
            this.drag = false;
            this.destroyDragPoint();
            this.releaseKeys();
          }
          break;
        case 'touchmove':
          if (!this.drag) {
            propagation = true;
            break;
          }
          this.pressKeys(e.data.getLocalPosition(this));
          break;
      }
      if (!propagation) {
        e.stopPropagation();
      }
    }
  }, {
    key: 'createDragPoint',
    value: function createDragPoint() {
      var dragPoint = new _PIXI.Graphics();
      dragPoint.beginFill(0xF2F2F2, 0.5);
      dragPoint.drawCircle(0, 0, 20);
      dragPoint.endFill();
      this.addChild(dragPoint);
      this.dragPoint = dragPoint;
    }
  }, {
    key: 'destroyDragPoint',
    value: function destroyDragPoint() {
      this.removeChild(this.dragPoint);
      this.dragPoint.destroy();
    }
  }, {
    key: 'pressKeys',
    value: function pressKeys(newPoint) {
      this.releaseKeys();
      // 感應靈敏度
      var threshold = 30;

      var vector = _Vector2.default.fromPoint(newPoint);
      var deg = vector.deg;
      var len = vector.length;

      if (len < threshold) {
        return;
      }
      var degAbs = Math.abs(deg);
      var dx = degAbs < 67.5 ? _control.RIGHT : degAbs > 112.5 ? _control.LEFT : false;
      var dy = degAbs < 22.5 || degAbs > 157.5 ? false : deg < 0 ? _control.UP : _control.DOWN;

      if (dx || dy) {
        if (dx) {
          _keyboardjs2.default.pressKey(dx);
        }
        if (dy) {
          _keyboardjs2.default.pressKey(dy);
        }
        vector.multiplyScalar(this.radius / len);
        this.dragPoint.position.set(vector.x, vector.y);
      }
    }
  }, {
    key: 'releaseKeys',
    value: function releaseKeys() {
      ALL_KEYS.forEach(function (key) {
        return _keyboardjs2.default.releaseKey(key);
      });
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'TouchDirectionControlPanel';
    }
  }]);

  return TouchDirectionControlPanel;
}(_PIXI.Container);

exports.default = TouchDirectionControlPanel;

},{"../config/control":20,"../lib/PIXI":28,"../lib/Vector":31,"keyboardjs":2}],65:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _PIXI = require('../lib/PIXI');

var _keyboardjs = require('keyboardjs');

var _keyboardjs2 = _interopRequireDefault(_keyboardjs);

var _control = require('../config/control');

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var TouchOperationControlPanel = function (_Container) {
  _inherits(TouchOperationControlPanel, _Container);

  function TouchOperationControlPanel(_ref) {
    var x = _ref.x,
        y = _ref.y,
        radius = _ref.radius;

    _classCallCheck(this, TouchOperationControlPanel);

    var _this = _possibleConstructorReturn(this, (TouchOperationControlPanel.__proto__ || Object.getPrototypeOf(TouchOperationControlPanel)).call(this));

    _this.position.set(x, y);

    var touchArea = new _PIXI.Graphics();
    touchArea.beginFill(0xF2F2F2, 0.5);
    touchArea.drawCircle(0, 0, radius);
    touchArea.endFill();
    _this.addChild(touchArea);
    _this.radius = radius;

    _this.setupTouch();
    return _this;
  }

  _createClass(TouchOperationControlPanel, [{
    key: 'setupTouch',
    value: function setupTouch() {
      this.interactive = true;
      var f = this.onTouch.bind(this);
      this.on('touchstart', f);
      this.on('touchend', f);
    }
  }, {
    key: 'onTouch',
    value: function onTouch(e) {
      var type = e.type;
      var propagation = false;
      switch (type) {
        case 'touchstart':
          this.drag = true;
          break;
        case 'touchend':
          if (this.drag) {
            this.drag = false;
            _keyboardjs2.default.pressKey(_control.PLACE1);
            _keyboardjs2.default.releaseKey(_control.PLACE1);
          }
          break;
      }
      if (!propagation) {
        e.stopPropagation();
      }
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'TouchOperationControlPanel';
    }
  }]);

  return TouchOperationControlPanel;
}(_PIXI.Container);

exports.default = TouchOperationControlPanel;

},{"../config/control":20,"../lib/PIXI":28,"keyboardjs":2}],66:[function(require,module,exports){
'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

var _PIXI = require('../lib/PIXI');

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }return call && ((typeof call === "undefined" ? "undefined" : _typeof(call)) === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + (typeof superClass === "undefined" ? "undefined" : _typeof(superClass)));
  }subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } });if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var Window = function (_Container) {
  _inherits(Window, _Container);

  function Window(_ref) {
    var x = _ref.x,
        y = _ref.y,
        width = _ref.width,
        height = _ref.height;

    _classCallCheck(this, Window);

    var _this = _possibleConstructorReturn(this, (Window.__proto__ || Object.getPrototypeOf(Window)).call(this));

    _this.position.set(x, y);

    var lineWidth = 3;

    var windowBg = new _PIXI.Graphics();
    windowBg.beginFill(0xF2F2F2);
    windowBg.lineStyle(lineWidth, 0x222222, 1);
    windowBg.drawRoundedRect(0, 0, width, height, 5);
    windowBg.endFill();
    _this.addChild(windowBg);
    return _this;
  }

  _createClass(Window, [{
    key: 'toString',
    value: function toString() {
      return 'window';
    }
  }]);

  return Window;
}(_PIXI.Container);

exports.default = Window;

},{"../lib/PIXI":28}],67:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];descriptor.enumerable = descriptor.enumerable || false;descriptor.configurable = true;if ("value" in descriptor) descriptor.writable = true;Object.defineProperty(target, descriptor.key, descriptor);
    }
  }return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);if (staticProps) defineProperties(Constructor, staticProps);return Constructor;
  };
}();

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

var OPT = Symbol('opt');

function _enableDraggable() {
  this.drag = false;
  this.interactive = true;
  var f = _onTouch.bind(this);
  this.on('touchstart', f);
  this.on('touchend', f);
  this.on('touchmove', f);
  this.on('touchendoutside', f);
  this.on('mousedown', f);
  this.on('mouseup', f);
  this.on('mousemove', f);
  this.on('mouseupoutside', f);
}

function _onTouch(e) {
  var type = e.type;
  var propagation = false;
  switch (type) {
    case 'touchstart':
    case 'mousedown':
      this.drag = e.data.global.clone();
      this.originPosition = {
        x: this.x,
        y: this.y
      };
      break;
    case 'touchend':
    case 'touchendoutside':
    case 'mouseup':
    case 'mouseupoutside':
      this.drag = false;
      break;
    case 'touchmove':
    case 'mousemove':
      if (!this.drag) {
        propagation = true;
        break;
      }
      var newPoint = e.data.global.clone();
      this.position.set(this.originPosition.x + newPoint.x - this.drag.x, this.originPosition.y + newPoint.y - this.drag.y);
      _fallbackToBoundary.call(this);
      this.emit('drag'); // maybe can pass param for some reason: e.data.getLocalPosition(this)
      break;
  }
  if (!propagation) {
    e.stopPropagation();
  }
}

// 退回邊界
function _fallbackToBoundary() {
  var _OPT = this[OPT],
      _OPT$width = _OPT.width,
      width = _OPT$width === undefined ? this.width : _OPT$width,
      _OPT$height = _OPT.height,
      height = _OPT$height === undefined ? this.height : _OPT$height,
      boundary = _OPT.boundary;

  this.x = Math.max(this.x, boundary.x);
  this.x = Math.min(this.x, boundary.x + boundary.width - width);
  this.y = Math.max(this.y, boundary.y);
  this.y = Math.min(this.y, boundary.y + boundary.height - height);
}

var Wrapper = function () {
  function Wrapper() {
    _classCallCheck(this, Wrapper);
  }

  _createClass(Wrapper, null, [{
    key: 'draggable',

    /**
     * displayObject: will wrapped DisplayObject
     * opt: {
     *  boundary: 拖曳邊界 { x, y, width, height }
     *  [, width]: 邊界碰撞寬(default: displayObject.width)
     *  [, height]: 邊界碰撞高(default: displayObject.height)
     *  }
     */
    value: function draggable(displayObject, opt) {
      displayObject[OPT] = opt;
      _enableDraggable.call(displayObject);
      displayObject.fallbackToBoundary = _fallbackToBoundary;
    }
  }]);

  return Wrapper;
}();

exports.default = Wrapper;

},{}]},{},[18])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9rZXlib2FyZGpzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2tleWJvYXJkanMvbGliL2tleS1jb21iby5qcyIsIm5vZGVfbW9kdWxlcy9rZXlib2FyZGpzL2xpYi9rZXlib2FyZC5qcyIsIm5vZGVfbW9kdWxlcy9rZXlib2FyZGpzL2xpYi9sb2NhbGUuanMiLCJub2RlX21vZHVsZXMva2V5Ym9hcmRqcy9sb2NhbGVzL3VzLmpzIiwibm9kZV9tb2R1bGVzL25ncmFwaC5ldmVudHMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbmdyYXBoLmdyYXBoL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL25ncmFwaC5wYXRoL2Etc3Rhci9Ob2RlSGVhcC5qcyIsIm5vZGVfbW9kdWxlcy9uZ3JhcGgucGF0aC9hLXN0YXIvYS1ncmVlZHktc3Rhci5qcyIsIm5vZGVfbW9kdWxlcy9uZ3JhcGgucGF0aC9hLXN0YXIvYS1zdGFyLmpzIiwibm9kZV9tb2R1bGVzL25ncmFwaC5wYXRoL2Etc3Rhci9kZWZhdWx0U2V0dGluZ3MuanMiLCJub2RlX21vZHVsZXMvbmdyYXBoLnBhdGgvYS1zdGFyL2hldXJpc3RpY3MuanMiLCJub2RlX21vZHVsZXMvbmdyYXBoLnBhdGgvYS1zdGFyL21ha2VTZWFyY2hTdGF0ZVBvb2wuanMiLCJub2RlX21vZHVsZXMvbmdyYXBoLnBhdGgvYS1zdGFyL25iYS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9uZ3JhcGgucGF0aC9hLXN0YXIvbmJhL21ha2VOQkFTZWFyY2hTdGF0ZVBvb2wuanMiLCJub2RlX21vZHVsZXMvbmdyYXBoLnBhdGgvaW5kZXguanMiLCJzcmMvYXBwLmpzIiwic3JjL2NvbmZpZy9jb25zdGFudHMuanMiLCJzcmMvY29uZmlnL2NvbnRyb2wuanMiLCJzcmMvbGliL0FwcGxpY2F0aW9uLmpzIiwic3JjL2xpYi9CdW1wLmpzIiwic3JjL2xpYi9HYW1lT2JqZWN0cy5qcyIsInNyYy9saWIvTGlnaHQuanMiLCJzcmMvbGliL01hcC5qcyIsInNyYy9saWIvTWFwR3JhcGguanMiLCJzcmMvbGliL01lc3NhZ2VzLmpzIiwic3JjL2xpYi9QSVhJLmpzIiwic3JjL2xpYi9TY2VuZS5qcyIsInNyYy9saWIvVGV4dHVyZS5qcyIsInNyYy9saWIvVmVjdG9yLmpzIiwic3JjL2xpYi91dGlscy5qcyIsInNyYy9vYmplY3RzL0Fpci5qcyIsInNyYy9vYmplY3RzL0J1bGxldC5qcyIsInNyYy9vYmplY3RzL0NhdC5qcyIsInNyYy9vYmplY3RzL0Rvb3IuanMiLCJzcmMvb2JqZWN0cy9HYW1lT2JqZWN0LmpzIiwic3JjL29iamVjdHMvR3Jhc3MuanMiLCJzcmMvb2JqZWN0cy9HcmFzc0RlY29yYXRlMS5qcyIsInNyYy9vYmplY3RzL0dyb3VuZC5qcyIsInNyYy9vYmplY3RzL0lyb25GZW5jZS5qcyIsInNyYy9vYmplY3RzL1Jvb3QuanMiLCJzcmMvb2JqZWN0cy9Ub3JjaC5qcyIsInNyYy9vYmplY3RzL1RyZWFzdXJlLmpzIiwic3JjL29iamVjdHMvVHJlZS5qcyIsInNyYy9vYmplY3RzL1dhbGwuanMiLCJzcmMvb2JqZWN0cy9hYmlsaXRpZXMvQWJpbGl0eS5qcyIsInNyYy9vYmplY3RzL2FiaWxpdGllcy9DYW1lcmEuanMiLCJzcmMvb2JqZWN0cy9hYmlsaXRpZXMvQ2FycnkuanMiLCJzcmMvb2JqZWN0cy9hYmlsaXRpZXMvRmlyZS5qcyIsInNyYy9vYmplY3RzL2FiaWxpdGllcy9LZXlGaXJlLmpzIiwic3JjL29iamVjdHMvYWJpbGl0aWVzL0tleU1vdmUuanMiLCJzcmMvb2JqZWN0cy9hYmlsaXRpZXMvS2V5UGxhY2UuanMiLCJzcmMvb2JqZWN0cy9hYmlsaXRpZXMvTGVhcm4uanMiLCJzcmMvb2JqZWN0cy9hYmlsaXRpZXMvTW92ZS5qcyIsInNyYy9vYmplY3RzL2FiaWxpdGllcy9PcGVyYXRlLmpzIiwic3JjL29iamVjdHMvYWJpbGl0aWVzL1BsYWNlLmpzIiwic3JjL3NjZW5lcy9Mb2FkaW5nU2NlbmUuanMiLCJzcmMvc2NlbmVzL1BsYXlTY2VuZS5qcyIsInNyYy91aS9JbnZlbnRvcnlXaW5kb3cuanMiLCJzcmMvdWkvTWVzc2FnZVdpbmRvdy5qcyIsInNyYy91aS9QbGF5ZXJXaW5kb3cuanMiLCJzcmMvdWkvU2Nyb2xsYWJsZVdpbmRvdy5qcyIsInNyYy91aS9Ub3VjaERpcmVjdGlvbkNvbnRyb2xQYW5lbC5qcyIsInNyYy91aS9Ub3VjaE9wZXJhdGlvbkNvbnRyb2xQYW5lbC5qcyIsInNyYy91aS9XaW5kb3cuanMiLCJzcmMvdWkvV3JhcHBlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM2dCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDbklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM5WEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6bEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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LEdBQ2hCLEtBRGdCLEtBQUEsR0FBQSxVQUFBO0FBQUEsTUFBQSxjQUFBLEtBQUEsTUFBQTtBQUFBLE1BQUEsU0FBQSxnQkFBQSxTQUFBLEdBQ0ssS0FETCxNQUFBLEdBQUEsV0FBQTtBQUFBLE1BQUEsV0FBQSxLQUFBLFFBQUE7O0FBRTlCLE9BQUEsQ0FBQSxHQUFTLEtBQUEsR0FBQSxDQUFTLEtBQVQsQ0FBQSxFQUFpQixTQUExQixDQUFTLENBQVQ7QUFDQSxPQUFBLENBQUEsR0FBUyxLQUFBLEdBQUEsQ0FBUyxLQUFULENBQUEsRUFBaUIsU0FBQSxDQUFBLEdBQWEsU0FBYixLQUFBLEdBQTFCLEtBQVMsQ0FBVDtBQUNBLE9BQUEsQ0FBQSxHQUFTLEtBQUEsR0FBQSxDQUFTLEtBQVQsQ0FBQSxFQUFpQixTQUExQixDQUFTLENBQVQ7QUFDQSxPQUFBLENBQUEsR0FBUyxLQUFBLEdBQUEsQ0FBUyxLQUFULENBQUEsRUFBaUIsU0FBQSxDQUFBLEdBQWEsU0FBYixNQUFBLEdBQTFCLE1BQVMsQ0FBVDtBQUNEOztJQUNLLFU7Ozs7Ozs7O0FBQ0o7Ozs7Ozs7OzhCQVFrQixhLEVBQWUsRyxFQUFLO0FBQ3BDLG9CQUFBLEdBQUEsSUFBQSxHQUFBO0FBQ0EsdUJBQUEsSUFBQSxDQUFBLGFBQUE7QUFDQSxvQkFBQSxrQkFBQSxHQUFBLG1CQUFBO0FBQ0Q7Ozs7OztrQkFHWSxPIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBvYmplY3RDcmVhdGUgPSBPYmplY3QuY3JlYXRlIHx8IG9iamVjdENyZWF0ZVBvbHlmaWxsXG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IG9iamVjdEtleXNQb2x5ZmlsbFxudmFyIGJpbmQgPSBGdW5jdGlvbi5wcm90b3R5cGUuYmluZCB8fCBmdW5jdGlvbkJpbmRQb2x5ZmlsbFxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwodGhpcywgJ19ldmVudHMnKSkge1xuICAgIHRoaXMuX2V2ZW50cyA9IG9iamVjdENyZWF0ZShudWxsKTtcbiAgICB0aGlzLl9ldmVudHNDb3VudCA9IDA7XG4gIH1cblxuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG52YXIgZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG52YXIgaGFzRGVmaW5lUHJvcGVydHk7XG50cnkge1xuICB2YXIgbyA9IHt9O1xuICBpZiAoT2JqZWN0LmRlZmluZVByb3BlcnR5KSBPYmplY3QuZGVmaW5lUHJvcGVydHkobywgJ3gnLCB7IHZhbHVlOiAwIH0pO1xuICBoYXNEZWZpbmVQcm9wZXJ0eSA9IG8ueCA9PT0gMDtcbn0gY2F0Y2ggKGVycikgeyBoYXNEZWZpbmVQcm9wZXJ0eSA9IGZhbHNlIH1cbmlmIChoYXNEZWZpbmVQcm9wZXJ0eSkge1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRXZlbnRFbWl0dGVyLCAnZGVmYXVsdE1heExpc3RlbmVycycsIHtcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24oYXJnKSB7XG4gICAgICAvLyBjaGVjayB3aGV0aGVyIHRoZSBpbnB1dCBpcyBhIHBvc2l0aXZlIG51bWJlciAod2hvc2UgdmFsdWUgaXMgemVybyBvclxuICAgICAgLy8gZ3JlYXRlciBhbmQgbm90IGEgTmFOKS5cbiAgICAgIGlmICh0eXBlb2YgYXJnICE9PSAnbnVtYmVyJyB8fCBhcmcgPCAwIHx8IGFyZyAhPT0gYXJnKVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImRlZmF1bHRNYXhMaXN0ZW5lcnNcIiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gICAgICBkZWZhdWx0TWF4TGlzdGVuZXJzID0gYXJnO1xuICAgIH1cbiAgfSk7XG59IGVsc2Uge1xuICBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IGRlZmF1bHRNYXhMaXN0ZW5lcnM7XG59XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uIHNldE1heExpc3RlbmVycyhuKSB7XG4gIGlmICh0eXBlb2YgbiAhPT0gJ251bWJlcicgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJuXCIgYXJndW1lbnQgbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbmZ1bmN0aW9uICRnZXRNYXhMaXN0ZW5lcnModGhhdCkge1xuICBpZiAodGhhdC5fbWF4TGlzdGVuZXJzID09PSB1bmRlZmluZWQpXG4gICAgcmV0dXJuIEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICByZXR1cm4gdGhhdC5fbWF4TGlzdGVuZXJzO1xufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmdldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uIGdldE1heExpc3RlbmVycygpIHtcbiAgcmV0dXJuICRnZXRNYXhMaXN0ZW5lcnModGhpcyk7XG59O1xuXG4vLyBUaGVzZSBzdGFuZGFsb25lIGVtaXQqIGZ1bmN0aW9ucyBhcmUgdXNlZCB0byBvcHRpbWl6ZSBjYWxsaW5nIG9mIGV2ZW50XG4vLyBoYW5kbGVycyBmb3IgZmFzdCBjYXNlcyBiZWNhdXNlIGVtaXQoKSBpdHNlbGYgb2Z0ZW4gaGFzIGEgdmFyaWFibGUgbnVtYmVyIG9mXG4vLyBhcmd1bWVudHMgYW5kIGNhbiBiZSBkZW9wdGltaXplZCBiZWNhdXNlIG9mIHRoYXQuIFRoZXNlIGZ1bmN0aW9ucyBhbHdheXMgaGF2ZVxuLy8gdGhlIHNhbWUgbnVtYmVyIG9mIGFyZ3VtZW50cyBhbmQgdGh1cyBkbyBub3QgZ2V0IGRlb3B0aW1pemVkLCBzbyB0aGUgY29kZVxuLy8gaW5zaWRlIHRoZW0gY2FuIGV4ZWN1dGUgZmFzdGVyLlxuZnVuY3Rpb24gZW1pdE5vbmUoaGFuZGxlciwgaXNGbiwgc2VsZikge1xuICBpZiAoaXNGbilcbiAgICBoYW5kbGVyLmNhbGwoc2VsZik7XG4gIGVsc2Uge1xuICAgIHZhciBsZW4gPSBoYW5kbGVyLmxlbmd0aDtcbiAgICB2YXIgbGlzdGVuZXJzID0gYXJyYXlDbG9uZShoYW5kbGVyLCBsZW4pO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpXG4gICAgICBsaXN0ZW5lcnNbaV0uY2FsbChzZWxmKTtcbiAgfVxufVxuZnVuY3Rpb24gZW1pdE9uZShoYW5kbGVyLCBpc0ZuLCBzZWxmLCBhcmcxKSB7XG4gIGlmIChpc0ZuKVxuICAgIGhhbmRsZXIuY2FsbChzZWxmLCBhcmcxKTtcbiAgZWxzZSB7XG4gICAgdmFyIGxlbiA9IGhhbmRsZXIubGVuZ3RoO1xuICAgIHZhciBsaXN0ZW5lcnMgPSBhcnJheUNsb25lKGhhbmRsZXIsIGxlbik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSlcbiAgICAgIGxpc3RlbmVyc1tpXS5jYWxsKHNlbGYsIGFyZzEpO1xuICB9XG59XG5mdW5jdGlvbiBlbWl0VHdvKGhhbmRsZXIsIGlzRm4sIHNlbGYsIGFyZzEsIGFyZzIpIHtcbiAgaWYgKGlzRm4pXG4gICAgaGFuZGxlci5jYWxsKHNlbGYsIGFyZzEsIGFyZzIpO1xuICBlbHNlIHtcbiAgICB2YXIgbGVuID0gaGFuZGxlci5sZW5ndGg7XG4gICAgdmFyIGxpc3RlbmVycyA9IGFycmF5Q2xvbmUoaGFuZGxlciwgbGVuKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgKytpKVxuICAgICAgbGlzdGVuZXJzW2ldLmNhbGwoc2VsZiwgYXJnMSwgYXJnMik7XG4gIH1cbn1cbmZ1bmN0aW9uIGVtaXRUaHJlZShoYW5kbGVyLCBpc0ZuLCBzZWxmLCBhcmcxLCBhcmcyLCBhcmczKSB7XG4gIGlmIChpc0ZuKVxuICAgIGhhbmRsZXIuY2FsbChzZWxmLCBhcmcxLCBhcmcyLCBhcmczKTtcbiAgZWxzZSB7XG4gICAgdmFyIGxlbiA9IGhhbmRsZXIubGVuZ3RoO1xuICAgIHZhciBsaXN0ZW5lcnMgPSBhcnJheUNsb25lKGhhbmRsZXIsIGxlbik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSlcbiAgICAgIGxpc3RlbmVyc1tpXS5jYWxsKHNlbGYsIGFyZzEsIGFyZzIsIGFyZzMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGVtaXRNYW55KGhhbmRsZXIsIGlzRm4sIHNlbGYsIGFyZ3MpIHtcbiAgaWYgKGlzRm4pXG4gICAgaGFuZGxlci5hcHBseShzZWxmLCBhcmdzKTtcbiAgZWxzZSB7XG4gICAgdmFyIGxlbiA9IGhhbmRsZXIubGVuZ3RoO1xuICAgIHZhciBsaXN0ZW5lcnMgPSBhcnJheUNsb25lKGhhbmRsZXIsIGxlbik7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSlcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseShzZWxmLCBhcmdzKTtcbiAgfVxufVxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiBlbWl0KHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGV2ZW50cztcbiAgdmFyIGRvRXJyb3IgPSAodHlwZSA9PT0gJ2Vycm9yJyk7XG5cbiAgZXZlbnRzID0gdGhpcy5fZXZlbnRzO1xuICBpZiAoZXZlbnRzKVxuICAgIGRvRXJyb3IgPSAoZG9FcnJvciAmJiBldmVudHMuZXJyb3IgPT0gbnVsbCk7XG4gIGVsc2UgaWYgKCFkb0Vycm9yKVxuICAgIHJldHVybiBmYWxzZTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmIChkb0Vycm9yKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKVxuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBBdCBsZWFzdCBnaXZlIHNvbWUga2luZCBvZiBjb250ZXh0IHRvIHRoZSB1c2VyXG4gICAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdVbmhhbmRsZWQgXCJlcnJvclwiIGV2ZW50LiAoJyArIGVyICsgJyknKTtcbiAgICAgIGVyci5jb250ZXh0ID0gZXI7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGhhbmRsZXIgPSBldmVudHNbdHlwZV07XG5cbiAgaWYgKCFoYW5kbGVyKVxuICAgIHJldHVybiBmYWxzZTtcblxuICB2YXIgaXNGbiA9IHR5cGVvZiBoYW5kbGVyID09PSAnZnVuY3Rpb24nO1xuICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICBzd2l0Y2ggKGxlbikge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgIGNhc2UgMTpcbiAgICAgIGVtaXROb25lKGhhbmRsZXIsIGlzRm4sIHRoaXMpO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAyOlxuICAgICAgZW1pdE9uZShoYW5kbGVyLCBpc0ZuLCB0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSAzOlxuICAgICAgZW1pdFR3byhoYW5kbGVyLCBpc0ZuLCB0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICBicmVhaztcbiAgICBjYXNlIDQ6XG4gICAgICBlbWl0VGhyZWUoaGFuZGxlciwgaXNGbiwgdGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0sIGFyZ3VtZW50c1szXSk7XG4gICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgIGRlZmF1bHQ6XG4gICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgIGVtaXRNYW55KGhhbmRsZXIsIGlzRm4sIHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5mdW5jdGlvbiBfYWRkTGlzdGVuZXIodGFyZ2V0LCB0eXBlLCBsaXN0ZW5lciwgcHJlcGVuZCkge1xuICB2YXIgbTtcbiAgdmFyIGV2ZW50cztcbiAgdmFyIGV4aXN0aW5nO1xuXG4gIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0ZW5lclwiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGV2ZW50cyA9IHRhcmdldC5fZXZlbnRzO1xuICBpZiAoIWV2ZW50cykge1xuICAgIGV2ZW50cyA9IHRhcmdldC5fZXZlbnRzID0gb2JqZWN0Q3JlYXRlKG51bGwpO1xuICAgIHRhcmdldC5fZXZlbnRzQ291bnQgPSAwO1xuICB9IGVsc2Uge1xuICAgIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gICAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICAgIGlmIChldmVudHMubmV3TGlzdGVuZXIpIHtcbiAgICAgIHRhcmdldC5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgPyBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICAgICAgLy8gUmUtYXNzaWduIGBldmVudHNgIGJlY2F1c2UgYSBuZXdMaXN0ZW5lciBoYW5kbGVyIGNvdWxkIGhhdmUgY2F1c2VkIHRoZVxuICAgICAgLy8gdGhpcy5fZXZlbnRzIHRvIGJlIGFzc2lnbmVkIHRvIGEgbmV3IG9iamVjdFxuICAgICAgZXZlbnRzID0gdGFyZ2V0Ll9ldmVudHM7XG4gICAgfVxuICAgIGV4aXN0aW5nID0gZXZlbnRzW3R5cGVdO1xuICB9XG5cbiAgaWYgKCFleGlzdGluZykge1xuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIGV4aXN0aW5nID0gZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gICAgKyt0YXJnZXQuX2V2ZW50c0NvdW50O1xuICB9IGVsc2Uge1xuICAgIGlmICh0eXBlb2YgZXhpc3RpbmcgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgICAgZXhpc3RpbmcgPSBldmVudHNbdHlwZV0gPVxuICAgICAgICAgIHByZXBlbmQgPyBbbGlzdGVuZXIsIGV4aXN0aW5nXSA6IFtleGlzdGluZywgbGlzdGVuZXJdO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgICBpZiAocHJlcGVuZCkge1xuICAgICAgICBleGlzdGluZy51bnNoaWZ0KGxpc3RlbmVyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGV4aXN0aW5nLnB1c2gobGlzdGVuZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gICAgaWYgKCFleGlzdGluZy53YXJuZWQpIHtcbiAgICAgIG0gPSAkZ2V0TWF4TGlzdGVuZXJzKHRhcmdldCk7XG4gICAgICBpZiAobSAmJiBtID4gMCAmJiBleGlzdGluZy5sZW5ndGggPiBtKSB7XG4gICAgICAgIGV4aXN0aW5nLndhcm5lZCA9IHRydWU7XG4gICAgICAgIHZhciB3ID0gbmV3IEVycm9yKCdQb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5IGxlYWsgZGV0ZWN0ZWQuICcgK1xuICAgICAgICAgICAgZXhpc3RpbmcubGVuZ3RoICsgJyBcIicgKyBTdHJpbmcodHlwZSkgKyAnXCIgbGlzdGVuZXJzICcgK1xuICAgICAgICAgICAgJ2FkZGVkLiBVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byAnICtcbiAgICAgICAgICAgICdpbmNyZWFzZSBsaW1pdC4nKTtcbiAgICAgICAgdy5uYW1lID0gJ01heExpc3RlbmVyc0V4Y2VlZGVkV2FybmluZyc7XG4gICAgICAgIHcuZW1pdHRlciA9IHRhcmdldDtcbiAgICAgICAgdy50eXBlID0gdHlwZTtcbiAgICAgICAgdy5jb3VudCA9IGV4aXN0aW5nLmxlbmd0aDtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25zb2xlID09PSAnb2JqZWN0JyAmJiBjb25zb2xlLndhcm4pIHtcbiAgICAgICAgICBjb25zb2xlLndhcm4oJyVzOiAlcycsIHcubmFtZSwgdy5tZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0YXJnZXQ7XG59XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbiBhZGRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICByZXR1cm4gX2FkZExpc3RlbmVyKHRoaXMsIHR5cGUsIGxpc3RlbmVyLCBmYWxzZSk7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5wcmVwZW5kTGlzdGVuZXIgPVxuICAgIGZ1bmN0aW9uIHByZXBlbmRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcikge1xuICAgICAgcmV0dXJuIF9hZGRMaXN0ZW5lcih0aGlzLCB0eXBlLCBsaXN0ZW5lciwgdHJ1ZSk7XG4gICAgfTtcblxuZnVuY3Rpb24gb25jZVdyYXBwZXIoKSB7XG4gIGlmICghdGhpcy5maXJlZCkge1xuICAgIHRoaXMudGFyZ2V0LnJlbW92ZUxpc3RlbmVyKHRoaXMudHlwZSwgdGhpcy53cmFwRm4pO1xuICAgIHRoaXMuZmlyZWQgPSB0cnVlO1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgY2FzZSAwOlxuICAgICAgICByZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0KTtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgcmV0dXJuIHRoaXMubGlzdGVuZXIuY2FsbCh0aGlzLnRhcmdldCwgYXJndW1lbnRzWzBdKTtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgcmV0dXJuIHRoaXMubGlzdGVuZXIuY2FsbCh0aGlzLnRhcmdldCwgYXJndW1lbnRzWzBdLCBhcmd1bWVudHNbMV0pO1xuICAgICAgY2FzZSAzOlxuICAgICAgICByZXR1cm4gdGhpcy5saXN0ZW5lci5jYWxsKHRoaXMudGFyZ2V0LCBhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSxcbiAgICAgICAgICAgIGFyZ3VtZW50c1syXSk7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgKytpKVxuICAgICAgICAgIGFyZ3NbaV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIHRoaXMubGlzdGVuZXIuYXBwbHkodGhpcy50YXJnZXQsIGFyZ3MpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBfb25jZVdyYXAodGFyZ2V0LCB0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgc3RhdGUgPSB7IGZpcmVkOiBmYWxzZSwgd3JhcEZuOiB1bmRlZmluZWQsIHRhcmdldDogdGFyZ2V0LCB0eXBlOiB0eXBlLCBsaXN0ZW5lcjogbGlzdGVuZXIgfTtcbiAgdmFyIHdyYXBwZWQgPSBiaW5kLmNhbGwob25jZVdyYXBwZXIsIHN0YXRlKTtcbiAgd3JhcHBlZC5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICBzdGF0ZS53cmFwRm4gPSB3cmFwcGVkO1xuICByZXR1cm4gd3JhcHBlZDtcbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24gb25jZSh0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAodHlwZW9mIGxpc3RlbmVyICE9PSAnZnVuY3Rpb24nKVxuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdGVuZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgdGhpcy5vbih0eXBlLCBfb25jZVdyYXAodGhpcywgdHlwZSwgbGlzdGVuZXIpKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnByZXBlbmRPbmNlTGlzdGVuZXIgPVxuICAgIGZ1bmN0aW9uIHByZXBlbmRPbmNlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXIpIHtcbiAgICAgIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09ICdmdW5jdGlvbicpXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wibGlzdGVuZXJcIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgIHRoaXMucHJlcGVuZExpc3RlbmVyKHR5cGUsIF9vbmNlV3JhcCh0aGlzLCB0eXBlLCBsaXN0ZW5lcikpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcblxuLy8gRW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmIGFuZCBvbmx5IGlmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPVxuICAgIGZ1bmN0aW9uIHJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyKSB7XG4gICAgICB2YXIgbGlzdCwgZXZlbnRzLCBwb3NpdGlvbiwgaSwgb3JpZ2luYWxMaXN0ZW5lcjtcblxuICAgICAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJsaXN0ZW5lclwiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gICAgICBldmVudHMgPSB0aGlzLl9ldmVudHM7XG4gICAgICBpZiAoIWV2ZW50cylcbiAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICAgIGxpc3QgPSBldmVudHNbdHlwZV07XG4gICAgICBpZiAoIWxpc3QpXG4gICAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHwgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpIHtcbiAgICAgICAgaWYgKC0tdGhpcy5fZXZlbnRzQ291bnQgPT09IDApXG4gICAgICAgICAgdGhpcy5fZXZlbnRzID0gb2JqZWN0Q3JlYXRlKG51bGwpO1xuICAgICAgICBlbHNlIHtcbiAgICAgICAgICBkZWxldGUgZXZlbnRzW3R5cGVdO1xuICAgICAgICAgIGlmIChldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICAgICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdC5saXN0ZW5lciB8fCBsaXN0ZW5lcik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGxpc3QgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgcG9zaXRpb24gPSAtMTtcblxuICAgICAgICBmb3IgKGkgPSBsaXN0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8IGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSB7XG4gICAgICAgICAgICBvcmlnaW5hbExpc3RlbmVyID0gbGlzdFtpXS5saXN0ZW5lcjtcbiAgICAgICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICAgICAgaWYgKHBvc2l0aW9uID09PSAwKVxuICAgICAgICAgIGxpc3Quc2hpZnQoKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNwbGljZU9uZShsaXN0LCBwb3NpdGlvbik7XG5cbiAgICAgICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKVxuICAgICAgICAgIGV2ZW50c1t0eXBlXSA9IGxpc3RbMF07XG5cbiAgICAgICAgaWYgKGV2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgb3JpZ2luYWxMaXN0ZW5lciB8fCBsaXN0ZW5lcik7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID1cbiAgICBmdW5jdGlvbiByZW1vdmVBbGxMaXN0ZW5lcnModHlwZSkge1xuICAgICAgdmFyIGxpc3RlbmVycywgZXZlbnRzLCBpO1xuXG4gICAgICBldmVudHMgPSB0aGlzLl9ldmVudHM7XG4gICAgICBpZiAoIWV2ZW50cylcbiAgICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICAgIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgICAgIGlmICghZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdGhpcy5fZXZlbnRzID0gb2JqZWN0Q3JlYXRlKG51bGwpO1xuICAgICAgICAgIHRoaXMuX2V2ZW50c0NvdW50ID0gMDtcbiAgICAgICAgfSBlbHNlIGlmIChldmVudHNbdHlwZV0pIHtcbiAgICAgICAgICBpZiAoLS10aGlzLl9ldmVudHNDb3VudCA9PT0gMClcbiAgICAgICAgICAgIHRoaXMuX2V2ZW50cyA9IG9iamVjdENyZWF0ZShudWxsKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBkZWxldGUgZXZlbnRzW3R5cGVdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuXG4gICAgICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHZhciBrZXlzID0gb2JqZWN0S2V5cyhldmVudHMpO1xuICAgICAgICB2YXIga2V5O1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgIGtleSA9IGtleXNbaV07XG4gICAgICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICAgICAgdGhpcy5fZXZlbnRzID0gb2JqZWN0Q3JlYXRlKG51bGwpO1xuICAgICAgICB0aGlzLl9ldmVudHNDb3VudCA9IDA7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfVxuXG4gICAgICBsaXN0ZW5lcnMgPSBldmVudHNbdHlwZV07XG5cbiAgICAgIGlmICh0eXBlb2YgbGlzdGVuZXJzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgICAgIH0gZWxzZSBpZiAobGlzdGVuZXJzKSB7XG4gICAgICAgIC8vIExJRk8gb3JkZXJcbiAgICAgICAgZm9yIChpID0gbGlzdGVuZXJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG5cbmZ1bmN0aW9uIF9saXN0ZW5lcnModGFyZ2V0LCB0eXBlLCB1bndyYXApIHtcbiAgdmFyIGV2ZW50cyA9IHRhcmdldC5fZXZlbnRzO1xuXG4gIGlmICghZXZlbnRzKVxuICAgIHJldHVybiBbXTtcblxuICB2YXIgZXZsaXN0ZW5lciA9IGV2ZW50c1t0eXBlXTtcbiAgaWYgKCFldmxpc3RlbmVyKVxuICAgIHJldHVybiBbXTtcblxuICBpZiAodHlwZW9mIGV2bGlzdGVuZXIgPT09ICdmdW5jdGlvbicpXG4gICAgcmV0dXJuIHVud3JhcCA/IFtldmxpc3RlbmVyLmxpc3RlbmVyIHx8IGV2bGlzdGVuZXJdIDogW2V2bGlzdGVuZXJdO1xuXG4gIHJldHVybiB1bndyYXAgPyB1bndyYXBMaXN0ZW5lcnMoZXZsaXN0ZW5lcikgOiBhcnJheUNsb25lKGV2bGlzdGVuZXIsIGV2bGlzdGVuZXIubGVuZ3RoKTtcbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbiBsaXN0ZW5lcnModHlwZSkge1xuICByZXR1cm4gX2xpc3RlbmVycyh0aGlzLCB0eXBlLCB0cnVlKTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmF3TGlzdGVuZXJzID0gZnVuY3Rpb24gcmF3TGlzdGVuZXJzKHR5cGUpIHtcbiAgcmV0dXJuIF9saXN0ZW5lcnModGhpcywgdHlwZSwgZmFsc2UpO1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIGlmICh0eXBlb2YgZW1pdHRlci5saXN0ZW5lckNvdW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGVtaXR0ZXIubGlzdGVuZXJDb3VudCh0eXBlKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbGlzdGVuZXJDb3VudC5jYWxsKGVtaXR0ZXIsIHR5cGUpO1xuICB9XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVyQ291bnQgPSBsaXN0ZW5lckNvdW50O1xuZnVuY3Rpb24gbGlzdGVuZXJDb3VudCh0eXBlKSB7XG4gIHZhciBldmVudHMgPSB0aGlzLl9ldmVudHM7XG5cbiAgaWYgKGV2ZW50cykge1xuICAgIHZhciBldmxpc3RlbmVyID0gZXZlbnRzW3R5cGVdO1xuXG4gICAgaWYgKHR5cGVvZiBldmxpc3RlbmVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9IGVsc2UgaWYgKGV2bGlzdGVuZXIpIHtcbiAgICAgIHJldHVybiBldmxpc3RlbmVyLmxlbmd0aDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gMDtcbn1cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5ldmVudE5hbWVzID0gZnVuY3Rpb24gZXZlbnROYW1lcygpIHtcbiAgcmV0dXJuIHRoaXMuX2V2ZW50c0NvdW50ID4gMCA/IFJlZmxlY3Qub3duS2V5cyh0aGlzLl9ldmVudHMpIDogW107XG59O1xuXG4vLyBBYm91dCAxLjV4IGZhc3RlciB0aGFuIHRoZSB0d28tYXJnIHZlcnNpb24gb2YgQXJyYXkjc3BsaWNlKCkuXG5mdW5jdGlvbiBzcGxpY2VPbmUobGlzdCwgaW5kZXgpIHtcbiAgZm9yICh2YXIgaSA9IGluZGV4LCBrID0gaSArIDEsIG4gPSBsaXN0Lmxlbmd0aDsgayA8IG47IGkgKz0gMSwgayArPSAxKVxuICAgIGxpc3RbaV0gPSBsaXN0W2tdO1xuICBsaXN0LnBvcCgpO1xufVxuXG5mdW5jdGlvbiBhcnJheUNsb25lKGFyciwgbikge1xuICB2YXIgY29weSA9IG5ldyBBcnJheShuKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyArK2kpXG4gICAgY29weVtpXSA9IGFycltpXTtcbiAgcmV0dXJuIGNvcHk7XG59XG5cbmZ1bmN0aW9uIHVud3JhcExpc3RlbmVycyhhcnIpIHtcbiAgdmFyIHJldCA9IG5ldyBBcnJheShhcnIubGVuZ3RoKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXQubGVuZ3RoOyArK2kpIHtcbiAgICByZXRbaV0gPSBhcnJbaV0ubGlzdGVuZXIgfHwgYXJyW2ldO1xuICB9XG4gIHJldHVybiByZXQ7XG59XG5cbmZ1bmN0aW9uIG9iamVjdENyZWF0ZVBvbHlmaWxsKHByb3RvKSB7XG4gIHZhciBGID0gZnVuY3Rpb24oKSB7fTtcbiAgRi5wcm90b3R5cGUgPSBwcm90bztcbiAgcmV0dXJuIG5ldyBGO1xufVxuZnVuY3Rpb24gb2JqZWN0S2V5c1BvbHlmaWxsKG9iaikge1xuICB2YXIga2V5cyA9IFtdO1xuICBmb3IgKHZhciBrIGluIG9iaikgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGspKSB7XG4gICAga2V5cy5wdXNoKGspO1xuICB9XG4gIHJldHVybiBrO1xufVxuZnVuY3Rpb24gZnVuY3Rpb25CaW5kUG9seWZpbGwoY29udGV4dCkge1xuICB2YXIgZm4gPSB0aGlzO1xuICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBmbi5hcHBseShjb250ZXh0LCBhcmd1bWVudHMpO1xuICB9O1xufVxuIiwiXG52YXIgS2V5Ym9hcmQgPSByZXF1aXJlKCcuL2xpYi9rZXlib2FyZCcpO1xudmFyIExvY2FsZSAgID0gcmVxdWlyZSgnLi9saWIvbG9jYWxlJyk7XG52YXIgS2V5Q29tYm8gPSByZXF1aXJlKCcuL2xpYi9rZXktY29tYm8nKTtcblxudmFyIGtleWJvYXJkID0gbmV3IEtleWJvYXJkKCk7XG5cbmtleWJvYXJkLnNldExvY2FsZSgndXMnLCByZXF1aXJlKCcuL2xvY2FsZXMvdXMnKSk7XG5cbmV4cG9ydHMgICAgICAgICAgPSBtb2R1bGUuZXhwb3J0cyA9IGtleWJvYXJkO1xuZXhwb3J0cy5LZXlib2FyZCA9IEtleWJvYXJkO1xuZXhwb3J0cy5Mb2NhbGUgICA9IExvY2FsZTtcbmV4cG9ydHMuS2V5Q29tYm8gPSBLZXlDb21ibztcbiIsIlxuZnVuY3Rpb24gS2V5Q29tYm8oa2V5Q29tYm9TdHIpIHtcbiAgdGhpcy5zb3VyY2VTdHIgPSBrZXlDb21ib1N0cjtcbiAgdGhpcy5zdWJDb21ib3MgPSBLZXlDb21iby5wYXJzZUNvbWJvU3RyKGtleUNvbWJvU3RyKTtcbiAgdGhpcy5rZXlOYW1lcyAgPSB0aGlzLnN1YkNvbWJvcy5yZWR1Y2UoZnVuY3Rpb24obWVtbywgbmV4dFN1YkNvbWJvKSB7XG4gICAgcmV0dXJuIG1lbW8uY29uY2F0KG5leHRTdWJDb21ibyk7XG4gIH0sIFtdKTtcbn1cblxuLy8gVE9ETzogQWRkIHN1cHBvcnQgZm9yIGtleSBjb21ibyBzZXF1ZW5jZXNcbktleUNvbWJvLnNlcXVlbmNlRGVsaW1pbmF0b3IgPSAnPj4nO1xuS2V5Q29tYm8uY29tYm9EZWxpbWluYXRvciAgICA9ICc+JztcbktleUNvbWJvLmtleURlbGltaW5hdG9yICAgICAgPSAnKyc7XG5cbktleUNvbWJvLnBhcnNlQ29tYm9TdHIgPSBmdW5jdGlvbihrZXlDb21ib1N0cikge1xuICB2YXIgc3ViQ29tYm9TdHJzID0gS2V5Q29tYm8uX3NwbGl0U3RyKGtleUNvbWJvU3RyLCBLZXlDb21iby5jb21ib0RlbGltaW5hdG9yKTtcbiAgdmFyIGNvbWJvICAgICAgICA9IFtdO1xuXG4gIGZvciAodmFyIGkgPSAwIDsgaSA8IHN1YkNvbWJvU3Rycy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGNvbWJvLnB1c2goS2V5Q29tYm8uX3NwbGl0U3RyKHN1YkNvbWJvU3Ryc1tpXSwgS2V5Q29tYm8ua2V5RGVsaW1pbmF0b3IpKTtcbiAgfVxuICByZXR1cm4gY29tYm87XG59O1xuXG5LZXlDb21iby5wcm90b3R5cGUuY2hlY2sgPSBmdW5jdGlvbihwcmVzc2VkS2V5TmFtZXMpIHtcbiAgdmFyIHN0YXJ0aW5nS2V5TmFtZUluZGV4ID0gMDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnN1YkNvbWJvcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHN0YXJ0aW5nS2V5TmFtZUluZGV4ID0gdGhpcy5fY2hlY2tTdWJDb21ibyhcbiAgICAgIHRoaXMuc3ViQ29tYm9zW2ldLFxuICAgICAgc3RhcnRpbmdLZXlOYW1lSW5kZXgsXG4gICAgICBwcmVzc2VkS2V5TmFtZXNcbiAgICApO1xuICAgIGlmIChzdGFydGluZ0tleU5hbWVJbmRleCA9PT0gLTEpIHsgcmV0dXJuIGZhbHNlOyB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5LZXlDb21iby5wcm90b3R5cGUuaXNFcXVhbCA9IGZ1bmN0aW9uKG90aGVyS2V5Q29tYm8pIHtcbiAgaWYgKFxuICAgICFvdGhlcktleUNvbWJvIHx8XG4gICAgdHlwZW9mIG90aGVyS2V5Q29tYm8gIT09ICdzdHJpbmcnICYmXG4gICAgdHlwZW9mIG90aGVyS2V5Q29tYm8gIT09ICdvYmplY3QnXG4gICkgeyByZXR1cm4gZmFsc2U7IH1cblxuICBpZiAodHlwZW9mIG90aGVyS2V5Q29tYm8gPT09ICdzdHJpbmcnKSB7XG4gICAgb3RoZXJLZXlDb21ibyA9IG5ldyBLZXlDb21ibyhvdGhlcktleUNvbWJvKTtcbiAgfVxuXG4gIGlmICh0aGlzLnN1YkNvbWJvcy5sZW5ndGggIT09IG90aGVyS2V5Q29tYm8uc3ViQ29tYm9zLmxlbmd0aCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuc3ViQ29tYm9zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgaWYgKHRoaXMuc3ViQ29tYm9zW2ldLmxlbmd0aCAhPT0gb3RoZXJLZXlDb21iby5zdWJDb21ib3NbaV0ubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnN1YkNvbWJvcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHZhciBzdWJDb21ibyAgICAgID0gdGhpcy5zdWJDb21ib3NbaV07XG4gICAgdmFyIG90aGVyU3ViQ29tYm8gPSBvdGhlcktleUNvbWJvLnN1YkNvbWJvc1tpXS5zbGljZSgwKTtcblxuICAgIGZvciAodmFyIGogPSAwOyBqIDwgc3ViQ29tYm8ubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgIHZhciBrZXlOYW1lID0gc3ViQ29tYm9bal07XG4gICAgICB2YXIgaW5kZXggICA9IG90aGVyU3ViQ29tYm8uaW5kZXhPZihrZXlOYW1lKTtcblxuICAgICAgaWYgKGluZGV4ID4gLTEpIHtcbiAgICAgICAgb3RoZXJTdWJDb21iby5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAob3RoZXJTdWJDb21iby5sZW5ndGggIT09IDApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbktleUNvbWJvLl9zcGxpdFN0ciA9IGZ1bmN0aW9uKHN0ciwgZGVsaW1pbmF0b3IpIHtcbiAgdmFyIHMgID0gc3RyO1xuICB2YXIgZCAgPSBkZWxpbWluYXRvcjtcbiAgdmFyIGMgID0gJyc7XG4gIHZhciBjYSA9IFtdO1xuXG4gIGZvciAodmFyIGNpID0gMDsgY2kgPCBzLmxlbmd0aDsgY2kgKz0gMSkge1xuICAgIGlmIChjaSA+IDAgJiYgc1tjaV0gPT09IGQgJiYgc1tjaSAtIDFdICE9PSAnXFxcXCcpIHtcbiAgICAgIGNhLnB1c2goYy50cmltKCkpO1xuICAgICAgYyA9ICcnO1xuICAgICAgY2kgKz0gMTtcbiAgICB9XG4gICAgYyArPSBzW2NpXTtcbiAgfVxuICBpZiAoYykgeyBjYS5wdXNoKGMudHJpbSgpKTsgfVxuXG4gIHJldHVybiBjYTtcbn07XG5cbktleUNvbWJvLnByb3RvdHlwZS5fY2hlY2tTdWJDb21ibyA9IGZ1bmN0aW9uKHN1YkNvbWJvLCBzdGFydGluZ0tleU5hbWVJbmRleCwgcHJlc3NlZEtleU5hbWVzKSB7XG4gIHN1YkNvbWJvID0gc3ViQ29tYm8uc2xpY2UoMCk7XG4gIHByZXNzZWRLZXlOYW1lcyA9IHByZXNzZWRLZXlOYW1lcy5zbGljZShzdGFydGluZ0tleU5hbWVJbmRleCk7XG5cbiAgdmFyIGVuZEluZGV4ID0gc3RhcnRpbmdLZXlOYW1lSW5kZXg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3ViQ29tYm8ubGVuZ3RoOyBpICs9IDEpIHtcblxuICAgIHZhciBrZXlOYW1lID0gc3ViQ29tYm9baV07XG4gICAgaWYgKGtleU5hbWVbMF0gPT09ICdcXFxcJykge1xuICAgICAgdmFyIGVzY2FwZWRLZXlOYW1lID0ga2V5TmFtZS5zbGljZSgxKTtcbiAgICAgIGlmIChcbiAgICAgICAgZXNjYXBlZEtleU5hbWUgPT09IEtleUNvbWJvLmNvbWJvRGVsaW1pbmF0b3IgfHxcbiAgICAgICAgZXNjYXBlZEtleU5hbWUgPT09IEtleUNvbWJvLmtleURlbGltaW5hdG9yXG4gICAgICApIHtcbiAgICAgICAga2V5TmFtZSA9IGVzY2FwZWRLZXlOYW1lO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBpbmRleCA9IHByZXNzZWRLZXlOYW1lcy5pbmRleE9mKGtleU5hbWUpO1xuICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICBzdWJDb21iby5zcGxpY2UoaSwgMSk7XG4gICAgICBpIC09IDE7XG4gICAgICBpZiAoaW5kZXggPiBlbmRJbmRleCkge1xuICAgICAgICBlbmRJbmRleCA9IGluZGV4O1xuICAgICAgfVxuICAgICAgaWYgKHN1YkNvbWJvLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gZW5kSW5kZXg7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiAtMTtcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBLZXlDb21ibztcbiIsIlxudmFyIExvY2FsZSA9IHJlcXVpcmUoJy4vbG9jYWxlJyk7XG52YXIgS2V5Q29tYm8gPSByZXF1aXJlKCcuL2tleS1jb21ibycpO1xuXG5cbmZ1bmN0aW9uIEtleWJvYXJkKHRhcmdldFdpbmRvdywgdGFyZ2V0RWxlbWVudCwgcGxhdGZvcm0sIHVzZXJBZ2VudCkge1xuICB0aGlzLl9sb2NhbGUgICAgICAgICAgICAgICA9IG51bGw7XG4gIHRoaXMuX2N1cnJlbnRDb250ZXh0ICAgICAgID0gbnVsbDtcbiAgdGhpcy5fY29udGV4dHMgICAgICAgICAgICAgPSB7fTtcbiAgdGhpcy5fbGlzdGVuZXJzICAgICAgICAgICAgPSBbXTtcbiAgdGhpcy5fYXBwbGllZExpc3RlbmVycyAgICAgPSBbXTtcbiAgdGhpcy5fbG9jYWxlcyAgICAgICAgICAgICAgPSB7fTtcbiAgdGhpcy5fdGFyZ2V0RWxlbWVudCAgICAgICAgPSBudWxsO1xuICB0aGlzLl90YXJnZXRXaW5kb3cgICAgICAgICA9IG51bGw7XG4gIHRoaXMuX3RhcmdldFBsYXRmb3JtICAgICAgID0gJyc7XG4gIHRoaXMuX3RhcmdldFVzZXJBZ2VudCAgICAgID0gJyc7XG4gIHRoaXMuX2lzTW9kZXJuQnJvd3NlciAgICAgID0gZmFsc2U7XG4gIHRoaXMuX3RhcmdldEtleURvd25CaW5kaW5nID0gbnVsbDtcbiAgdGhpcy5fdGFyZ2V0S2V5VXBCaW5kaW5nICAgPSBudWxsO1xuICB0aGlzLl90YXJnZXRSZXNldEJpbmRpbmcgICA9IG51bGw7XG4gIHRoaXMuX3BhdXNlZCAgICAgICAgICAgICAgID0gZmFsc2U7XG4gIHRoaXMuX2NhbGxlckhhbmRsZXIgICAgICAgID0gbnVsbDtcblxuICB0aGlzLnNldENvbnRleHQoJ2dsb2JhbCcpO1xuICB0aGlzLndhdGNoKHRhcmdldFdpbmRvdywgdGFyZ2V0RWxlbWVudCwgcGxhdGZvcm0sIHVzZXJBZ2VudCk7XG59XG5cbktleWJvYXJkLnByb3RvdHlwZS5zZXRMb2NhbGUgPSBmdW5jdGlvbihsb2NhbGVOYW1lLCBsb2NhbGVCdWlsZGVyKSB7XG4gIHZhciBsb2NhbGUgPSBudWxsO1xuICBpZiAodHlwZW9mIGxvY2FsZU5hbWUgPT09ICdzdHJpbmcnKSB7XG5cbiAgICBpZiAobG9jYWxlQnVpbGRlcikge1xuICAgICAgbG9jYWxlID0gbmV3IExvY2FsZShsb2NhbGVOYW1lKTtcbiAgICAgIGxvY2FsZUJ1aWxkZXIobG9jYWxlLCB0aGlzLl90YXJnZXRQbGF0Zm9ybSwgdGhpcy5fdGFyZ2V0VXNlckFnZW50KTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9jYWxlID0gdGhpcy5fbG9jYWxlc1tsb2NhbGVOYW1lXSB8fCBudWxsO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBsb2NhbGUgICAgID0gbG9jYWxlTmFtZTtcbiAgICBsb2NhbGVOYW1lID0gbG9jYWxlLl9sb2NhbGVOYW1lO1xuICB9XG5cbiAgdGhpcy5fbG9jYWxlICAgICAgICAgICAgICA9IGxvY2FsZTtcbiAgdGhpcy5fbG9jYWxlc1tsb2NhbGVOYW1lXSA9IGxvY2FsZTtcbiAgaWYgKGxvY2FsZSkge1xuICAgIHRoaXMuX2xvY2FsZS5wcmVzc2VkS2V5cyA9IGxvY2FsZS5wcmVzc2VkS2V5cztcbiAgfVxufTtcblxuS2V5Ym9hcmQucHJvdG90eXBlLmdldExvY2FsZSA9IGZ1bmN0aW9uKGxvY2FsTmFtZSkge1xuICBsb2NhbE5hbWUgfHwgKGxvY2FsTmFtZSA9IHRoaXMuX2xvY2FsZS5sb2NhbGVOYW1lKTtcbiAgcmV0dXJuIHRoaXMuX2xvY2FsZXNbbG9jYWxOYW1lXSB8fCBudWxsO1xufTtcblxuS2V5Ym9hcmQucHJvdG90eXBlLmJpbmQgPSBmdW5jdGlvbihrZXlDb21ib1N0ciwgcHJlc3NIYW5kbGVyLCByZWxlYXNlSGFuZGxlciwgcHJldmVudFJlcGVhdEJ5RGVmYXVsdCkge1xuICBpZiAoa2V5Q29tYm9TdHIgPT09IG51bGwgfHwgdHlwZW9mIGtleUNvbWJvU3RyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcHJldmVudFJlcGVhdEJ5RGVmYXVsdCA9IHJlbGVhc2VIYW5kbGVyO1xuICAgIHJlbGVhc2VIYW5kbGVyICAgICAgICAgPSBwcmVzc0hhbmRsZXI7XG4gICAgcHJlc3NIYW5kbGVyICAgICAgICAgICA9IGtleUNvbWJvU3RyO1xuICAgIGtleUNvbWJvU3RyICAgICAgICAgICAgPSBudWxsO1xuICB9XG5cbiAgaWYgKFxuICAgIGtleUNvbWJvU3RyICYmXG4gICAgdHlwZW9mIGtleUNvbWJvU3RyID09PSAnb2JqZWN0JyAmJlxuICAgIHR5cGVvZiBrZXlDb21ib1N0ci5sZW5ndGggPT09ICdudW1iZXInXG4gICkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5Q29tYm9TdHIubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIHRoaXMuYmluZChrZXlDb21ib1N0cltpXSwgcHJlc3NIYW5kbGVyLCByZWxlYXNlSGFuZGxlcik7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuXG4gIHRoaXMuX2xpc3RlbmVycy5wdXNoKHtcbiAgICBrZXlDb21ibyAgICAgICAgICAgICAgIDoga2V5Q29tYm9TdHIgPyBuZXcgS2V5Q29tYm8oa2V5Q29tYm9TdHIpIDogbnVsbCxcbiAgICBwcmVzc0hhbmRsZXIgICAgICAgICAgIDogcHJlc3NIYW5kbGVyICAgICAgICAgICB8fCBudWxsLFxuICAgIHJlbGVhc2VIYW5kbGVyICAgICAgICAgOiByZWxlYXNlSGFuZGxlciAgICAgICAgIHx8IG51bGwsXG4gICAgcHJldmVudFJlcGVhdCAgICAgICAgICA6IHByZXZlbnRSZXBlYXRCeURlZmF1bHQgfHwgZmFsc2UsXG4gICAgcHJldmVudFJlcGVhdEJ5RGVmYXVsdCA6IHByZXZlbnRSZXBlYXRCeURlZmF1bHQgfHwgZmFsc2VcbiAgfSk7XG59O1xuS2V5Ym9hcmQucHJvdG90eXBlLmFkZExpc3RlbmVyID0gS2V5Ym9hcmQucHJvdG90eXBlLmJpbmQ7XG5LZXlib2FyZC5wcm90b3R5cGUub24gICAgICAgICAgPSBLZXlib2FyZC5wcm90b3R5cGUuYmluZDtcblxuS2V5Ym9hcmQucHJvdG90eXBlLnVuYmluZCA9IGZ1bmN0aW9uKGtleUNvbWJvU3RyLCBwcmVzc0hhbmRsZXIsIHJlbGVhc2VIYW5kbGVyKSB7XG4gIGlmIChrZXlDb21ib1N0ciA9PT0gbnVsbCB8fCB0eXBlb2Yga2V5Q29tYm9TdHIgPT09ICdmdW5jdGlvbicpIHtcbiAgICByZWxlYXNlSGFuZGxlciA9IHByZXNzSGFuZGxlcjtcbiAgICBwcmVzc0hhbmRsZXIgICA9IGtleUNvbWJvU3RyO1xuICAgIGtleUNvbWJvU3RyID0gbnVsbDtcbiAgfVxuXG4gIGlmIChcbiAgICBrZXlDb21ib1N0ciAmJlxuICAgIHR5cGVvZiBrZXlDb21ib1N0ciA9PT0gJ29iamVjdCcgJiZcbiAgICB0eXBlb2Yga2V5Q29tYm9TdHIubGVuZ3RoID09PSAnbnVtYmVyJ1xuICApIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleUNvbWJvU3RyLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICB0aGlzLnVuYmluZChrZXlDb21ib1N0cltpXSwgcHJlc3NIYW5kbGVyLCByZWxlYXNlSGFuZGxlcik7XG4gICAgfVxuICAgIHJldHVybjtcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fbGlzdGVuZXJzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgdmFyIGxpc3RlbmVyID0gdGhpcy5fbGlzdGVuZXJzW2ldO1xuXG4gICAgdmFyIGNvbWJvTWF0Y2hlcyAgICAgICAgICA9ICFrZXlDb21ib1N0ciAmJiAhbGlzdGVuZXIua2V5Q29tYm8gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGlzdGVuZXIua2V5Q29tYm8gJiYgbGlzdGVuZXIua2V5Q29tYm8uaXNFcXVhbChrZXlDb21ib1N0cik7XG4gICAgdmFyIHByZXNzSGFuZGxlck1hdGNoZXMgICA9ICFwcmVzc0hhbmRsZXIgJiYgIXJlbGVhc2VIYW5kbGVyIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICFwcmVzc0hhbmRsZXIgJiYgIWxpc3RlbmVyLnByZXNzSGFuZGxlciB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcmVzc0hhbmRsZXIgPT09IGxpc3RlbmVyLnByZXNzSGFuZGxlcjtcbiAgICB2YXIgcmVsZWFzZUhhbmRsZXJNYXRjaGVzID0gIXByZXNzSGFuZGxlciAmJiAhcmVsZWFzZUhhbmRsZXIgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIXJlbGVhc2VIYW5kbGVyICYmICFsaXN0ZW5lci5yZWxlYXNlSGFuZGxlciB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWxlYXNlSGFuZGxlciA9PT0gbGlzdGVuZXIucmVsZWFzZUhhbmRsZXI7XG5cbiAgICBpZiAoY29tYm9NYXRjaGVzICYmIHByZXNzSGFuZGxlck1hdGNoZXMgJiYgcmVsZWFzZUhhbmRsZXJNYXRjaGVzKSB7XG4gICAgICB0aGlzLl9saXN0ZW5lcnMuc3BsaWNlKGksIDEpO1xuICAgICAgaSAtPSAxO1xuICAgIH1cbiAgfVxufTtcbktleWJvYXJkLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IEtleWJvYXJkLnByb3RvdHlwZS51bmJpbmQ7XG5LZXlib2FyZC5wcm90b3R5cGUub2ZmICAgICAgICAgICAgPSBLZXlib2FyZC5wcm90b3R5cGUudW5iaW5kO1xuXG5LZXlib2FyZC5wcm90b3R5cGUuc2V0Q29udGV4dCA9IGZ1bmN0aW9uKGNvbnRleHROYW1lKSB7XG4gIGlmKHRoaXMuX2xvY2FsZSkgeyB0aGlzLnJlbGVhc2VBbGxLZXlzKCk7IH1cblxuICBpZiAoIXRoaXMuX2NvbnRleHRzW2NvbnRleHROYW1lXSkge1xuICAgIHRoaXMuX2NvbnRleHRzW2NvbnRleHROYW1lXSA9IFtdO1xuICB9XG4gIHRoaXMuX2xpc3RlbmVycyAgICAgID0gdGhpcy5fY29udGV4dHNbY29udGV4dE5hbWVdO1xuICB0aGlzLl9jdXJyZW50Q29udGV4dCA9IGNvbnRleHROYW1lO1xufTtcblxuS2V5Ym9hcmQucHJvdG90eXBlLmdldENvbnRleHQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuX2N1cnJlbnRDb250ZXh0O1xufTtcblxuS2V5Ym9hcmQucHJvdG90eXBlLndpdGhDb250ZXh0ID0gZnVuY3Rpb24oY29udGV4dE5hbWUsIGNhbGxiYWNrKSB7XG4gIHZhciBwcmV2aW91c0NvbnRleHROYW1lID0gdGhpcy5nZXRDb250ZXh0KCk7XG4gIHRoaXMuc2V0Q29udGV4dChjb250ZXh0TmFtZSk7XG5cbiAgY2FsbGJhY2soKTtcblxuICB0aGlzLnNldENvbnRleHQocHJldmlvdXNDb250ZXh0TmFtZSk7XG59O1xuXG5LZXlib2FyZC5wcm90b3R5cGUud2F0Y2ggPSBmdW5jdGlvbih0YXJnZXRXaW5kb3csIHRhcmdldEVsZW1lbnQsIHRhcmdldFBsYXRmb3JtLCB0YXJnZXRVc2VyQWdlbnQpIHtcbiAgdmFyIF90aGlzID0gdGhpcztcblxuICB0aGlzLnN0b3AoKTtcblxuICBpZiAoIXRhcmdldFdpbmRvdykge1xuICAgIGlmICghZ2xvYmFsLmFkZEV2ZW50TGlzdGVuZXIgJiYgIWdsb2JhbC5hdHRhY2hFdmVudCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdDYW5ub3QgZmluZCBnbG9iYWwgZnVuY3Rpb25zIGFkZEV2ZW50TGlzdGVuZXIgb3IgYXR0YWNoRXZlbnQuJyk7XG4gICAgfVxuICAgIHRhcmdldFdpbmRvdyA9IGdsb2JhbDtcbiAgfVxuXG4gIGlmICh0eXBlb2YgdGFyZ2V0V2luZG93Lm5vZGVUeXBlID09PSAnbnVtYmVyJykge1xuICAgIHRhcmdldFVzZXJBZ2VudCA9IHRhcmdldFBsYXRmb3JtO1xuICAgIHRhcmdldFBsYXRmb3JtICA9IHRhcmdldEVsZW1lbnQ7XG4gICAgdGFyZ2V0RWxlbWVudCAgID0gdGFyZ2V0V2luZG93O1xuICAgIHRhcmdldFdpbmRvdyAgICA9IGdsb2JhbDtcbiAgfVxuXG4gIGlmICghdGFyZ2V0V2luZG93LmFkZEV2ZW50TGlzdGVuZXIgJiYgIXRhcmdldFdpbmRvdy5hdHRhY2hFdmVudCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ2Fubm90IGZpbmQgYWRkRXZlbnRMaXN0ZW5lciBvciBhdHRhY2hFdmVudCBtZXRob2RzIG9uIHRhcmdldFdpbmRvdy4nKTtcbiAgfVxuXG4gIHRoaXMuX2lzTW9kZXJuQnJvd3NlciA9ICEhdGFyZ2V0V2luZG93LmFkZEV2ZW50TGlzdGVuZXI7XG5cbiAgdmFyIHVzZXJBZ2VudCA9IHRhcmdldFdpbmRvdy5uYXZpZ2F0b3IgJiYgdGFyZ2V0V2luZG93Lm5hdmlnYXRvci51c2VyQWdlbnQgfHwgJyc7XG4gIHZhciBwbGF0Zm9ybSAgPSB0YXJnZXRXaW5kb3cubmF2aWdhdG9yICYmIHRhcmdldFdpbmRvdy5uYXZpZ2F0b3IucGxhdGZvcm0gIHx8ICcnO1xuXG4gIHRhcmdldEVsZW1lbnQgICAmJiB0YXJnZXRFbGVtZW50ICAgIT09IG51bGwgfHwgKHRhcmdldEVsZW1lbnQgICA9IHRhcmdldFdpbmRvdy5kb2N1bWVudCk7XG4gIHRhcmdldFBsYXRmb3JtICAmJiB0YXJnZXRQbGF0Zm9ybSAgIT09IG51bGwgfHwgKHRhcmdldFBsYXRmb3JtICA9IHBsYXRmb3JtKTtcbiAgdGFyZ2V0VXNlckFnZW50ICYmIHRhcmdldFVzZXJBZ2VudCAhPT0gbnVsbCB8fCAodGFyZ2V0VXNlckFnZW50ID0gdXNlckFnZW50KTtcblxuICB0aGlzLl90YXJnZXRLZXlEb3duQmluZGluZyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgX3RoaXMucHJlc3NLZXkoZXZlbnQua2V5Q29kZSwgZXZlbnQpO1xuICAgIF90aGlzLl9oYW5kbGVDb21tYW5kQnVnKGV2ZW50LCBwbGF0Zm9ybSk7XG4gIH07XG4gIHRoaXMuX3RhcmdldEtleVVwQmluZGluZyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgX3RoaXMucmVsZWFzZUtleShldmVudC5rZXlDb2RlLCBldmVudCk7XG4gIH07XG4gIHRoaXMuX3RhcmdldFJlc2V0QmluZGluZyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgX3RoaXMucmVsZWFzZUFsbEtleXMoZXZlbnQpXG4gIH07XG5cbiAgdGhpcy5fYmluZEV2ZW50KHRhcmdldEVsZW1lbnQsICdrZXlkb3duJywgdGhpcy5fdGFyZ2V0S2V5RG93bkJpbmRpbmcpO1xuICB0aGlzLl9iaW5kRXZlbnQodGFyZ2V0RWxlbWVudCwgJ2tleXVwJywgICB0aGlzLl90YXJnZXRLZXlVcEJpbmRpbmcpO1xuICB0aGlzLl9iaW5kRXZlbnQodGFyZ2V0V2luZG93LCAgJ2ZvY3VzJywgICB0aGlzLl90YXJnZXRSZXNldEJpbmRpbmcpO1xuICB0aGlzLl9iaW5kRXZlbnQodGFyZ2V0V2luZG93LCAgJ2JsdXInLCAgICB0aGlzLl90YXJnZXRSZXNldEJpbmRpbmcpO1xuXG4gIHRoaXMuX3RhcmdldEVsZW1lbnQgICA9IHRhcmdldEVsZW1lbnQ7XG4gIHRoaXMuX3RhcmdldFdpbmRvdyAgICA9IHRhcmdldFdpbmRvdztcbiAgdGhpcy5fdGFyZ2V0UGxhdGZvcm0gID0gdGFyZ2V0UGxhdGZvcm07XG4gIHRoaXMuX3RhcmdldFVzZXJBZ2VudCA9IHRhcmdldFVzZXJBZ2VudDtcbn07XG5cbktleWJvYXJkLnByb3RvdHlwZS5zdG9wID0gZnVuY3Rpb24oKSB7XG4gIHZhciBfdGhpcyA9IHRoaXM7XG5cbiAgaWYgKCF0aGlzLl90YXJnZXRFbGVtZW50IHx8ICF0aGlzLl90YXJnZXRXaW5kb3cpIHsgcmV0dXJuOyB9XG5cbiAgdGhpcy5fdW5iaW5kRXZlbnQodGhpcy5fdGFyZ2V0RWxlbWVudCwgJ2tleWRvd24nLCB0aGlzLl90YXJnZXRLZXlEb3duQmluZGluZyk7XG4gIHRoaXMuX3VuYmluZEV2ZW50KHRoaXMuX3RhcmdldEVsZW1lbnQsICdrZXl1cCcsICAgdGhpcy5fdGFyZ2V0S2V5VXBCaW5kaW5nKTtcbiAgdGhpcy5fdW5iaW5kRXZlbnQodGhpcy5fdGFyZ2V0V2luZG93LCAgJ2ZvY3VzJywgICB0aGlzLl90YXJnZXRSZXNldEJpbmRpbmcpO1xuICB0aGlzLl91bmJpbmRFdmVudCh0aGlzLl90YXJnZXRXaW5kb3csICAnYmx1cicsICAgIHRoaXMuX3RhcmdldFJlc2V0QmluZGluZyk7XG5cbiAgdGhpcy5fdGFyZ2V0V2luZG93ICA9IG51bGw7XG4gIHRoaXMuX3RhcmdldEVsZW1lbnQgPSBudWxsO1xufTtcblxuS2V5Ym9hcmQucHJvdG90eXBlLnByZXNzS2V5ID0gZnVuY3Rpb24oa2V5Q29kZSwgZXZlbnQpIHtcbiAgaWYgKHRoaXMuX3BhdXNlZCkgeyByZXR1cm47IH1cbiAgaWYgKCF0aGlzLl9sb2NhbGUpIHsgdGhyb3cgbmV3IEVycm9yKCdMb2NhbGUgbm90IHNldCcpOyB9XG5cbiAgdGhpcy5fbG9jYWxlLnByZXNzS2V5KGtleUNvZGUpO1xuICB0aGlzLl9hcHBseUJpbmRpbmdzKGV2ZW50KTtcbn07XG5cbktleWJvYXJkLnByb3RvdHlwZS5yZWxlYXNlS2V5ID0gZnVuY3Rpb24oa2V5Q29kZSwgZXZlbnQpIHtcbiAgaWYgKHRoaXMuX3BhdXNlZCkgeyByZXR1cm47IH1cbiAgaWYgKCF0aGlzLl9sb2NhbGUpIHsgdGhyb3cgbmV3IEVycm9yKCdMb2NhbGUgbm90IHNldCcpOyB9XG5cbiAgdGhpcy5fbG9jYWxlLnJlbGVhc2VLZXkoa2V5Q29kZSk7XG4gIHRoaXMuX2NsZWFyQmluZGluZ3MoZXZlbnQpO1xufTtcblxuS2V5Ym9hcmQucHJvdG90eXBlLnJlbGVhc2VBbGxLZXlzID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgaWYgKHRoaXMuX3BhdXNlZCkgeyByZXR1cm47IH1cbiAgaWYgKCF0aGlzLl9sb2NhbGUpIHsgdGhyb3cgbmV3IEVycm9yKCdMb2NhbGUgbm90IHNldCcpOyB9XG5cbiAgdGhpcy5fbG9jYWxlLnByZXNzZWRLZXlzLmxlbmd0aCA9IDA7XG4gIHRoaXMuX2NsZWFyQmluZGluZ3MoZXZlbnQpO1xufTtcblxuS2V5Ym9hcmQucHJvdG90eXBlLnBhdXNlID0gZnVuY3Rpb24oKSB7XG4gIGlmICh0aGlzLl9wYXVzZWQpIHsgcmV0dXJuOyB9XG4gIGlmICh0aGlzLl9sb2NhbGUpIHsgdGhpcy5yZWxlYXNlQWxsS2V5cygpOyB9XG4gIHRoaXMuX3BhdXNlZCA9IHRydWU7XG59O1xuXG5LZXlib2FyZC5wcm90b3R5cGUucmVzdW1lID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX3BhdXNlZCA9IGZhbHNlO1xufTtcblxuS2V5Ym9hcmQucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMucmVsZWFzZUFsbEtleXMoKTtcbiAgdGhpcy5fbGlzdGVuZXJzLmxlbmd0aCA9IDA7XG59O1xuXG5LZXlib2FyZC5wcm90b3R5cGUuX2JpbmRFdmVudCA9IGZ1bmN0aW9uKHRhcmdldEVsZW1lbnQsIGV2ZW50TmFtZSwgaGFuZGxlcikge1xuICByZXR1cm4gdGhpcy5faXNNb2Rlcm5Ccm93c2VyID9cbiAgICB0YXJnZXRFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnROYW1lLCBoYW5kbGVyLCBmYWxzZSkgOlxuICAgIHRhcmdldEVsZW1lbnQuYXR0YWNoRXZlbnQoJ29uJyArIGV2ZW50TmFtZSwgaGFuZGxlcik7XG59O1xuXG5LZXlib2FyZC5wcm90b3R5cGUuX3VuYmluZEV2ZW50ID0gZnVuY3Rpb24odGFyZ2V0RWxlbWVudCwgZXZlbnROYW1lLCBoYW5kbGVyKSB7XG4gIHJldHVybiB0aGlzLl9pc01vZGVybkJyb3dzZXIgP1xuICAgIHRhcmdldEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudE5hbWUsIGhhbmRsZXIsIGZhbHNlKSA6XG4gICAgdGFyZ2V0RWxlbWVudC5kZXRhY2hFdmVudCgnb24nICsgZXZlbnROYW1lLCBoYW5kbGVyKTtcbn07XG5cbktleWJvYXJkLnByb3RvdHlwZS5fZ2V0R3JvdXBlZExpc3RlbmVycyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbGlzdGVuZXJHcm91cHMgICA9IFtdO1xuICB2YXIgbGlzdGVuZXJHcm91cE1hcCA9IFtdO1xuXG4gIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnM7XG4gIGlmICh0aGlzLl9jdXJyZW50Q29udGV4dCAhPT0gJ2dsb2JhbCcpIHtcbiAgICBsaXN0ZW5lcnMgPSBbXS5jb25jYXQobGlzdGVuZXJzLCB0aGlzLl9jb250ZXh0cy5nbG9iYWwpO1xuICB9XG5cbiAgbGlzdGVuZXJzLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiAoYi5rZXlDb21ibyA/IGIua2V5Q29tYm8ua2V5TmFtZXMubGVuZ3RoIDogMCkgLSAoYS5rZXlDb21ibyA/IGEua2V5Q29tYm8ua2V5TmFtZXMubGVuZ3RoIDogMCk7XG4gIH0pLmZvckVhY2goZnVuY3Rpb24obCkge1xuICAgIHZhciBtYXBJbmRleCA9IC0xO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJHcm91cE1hcC5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgaWYgKGxpc3RlbmVyR3JvdXBNYXBbaV0gPT09IG51bGwgJiYgbC5rZXlDb21ibyA9PT0gbnVsbCB8fFxuICAgICAgICAgIGxpc3RlbmVyR3JvdXBNYXBbaV0gIT09IG51bGwgJiYgbGlzdGVuZXJHcm91cE1hcFtpXS5pc0VxdWFsKGwua2V5Q29tYm8pKSB7XG4gICAgICAgIG1hcEluZGV4ID0gaTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG1hcEluZGV4ID09PSAtMSkge1xuICAgICAgbWFwSW5kZXggPSBsaXN0ZW5lckdyb3VwTWFwLmxlbmd0aDtcbiAgICAgIGxpc3RlbmVyR3JvdXBNYXAucHVzaChsLmtleUNvbWJvKTtcbiAgICB9XG4gICAgaWYgKCFsaXN0ZW5lckdyb3Vwc1ttYXBJbmRleF0pIHtcbiAgICAgIGxpc3RlbmVyR3JvdXBzW21hcEluZGV4XSA9IFtdO1xuICAgIH1cbiAgICBsaXN0ZW5lckdyb3Vwc1ttYXBJbmRleF0ucHVzaChsKTtcbiAgfSk7XG4gIHJldHVybiBsaXN0ZW5lckdyb3Vwcztcbn07XG5cbktleWJvYXJkLnByb3RvdHlwZS5fYXBwbHlCaW5kaW5ncyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHZhciBwcmV2ZW50UmVwZWF0ID0gZmFsc2U7XG5cbiAgZXZlbnQgfHwgKGV2ZW50ID0ge30pO1xuICBldmVudC5wcmV2ZW50UmVwZWF0ID0gZnVuY3Rpb24oKSB7IHByZXZlbnRSZXBlYXQgPSB0cnVlOyB9O1xuICBldmVudC5wcmVzc2VkS2V5cyAgID0gdGhpcy5fbG9jYWxlLnByZXNzZWRLZXlzLnNsaWNlKDApO1xuXG4gIHZhciBwcmVzc2VkS2V5cyAgICA9IHRoaXMuX2xvY2FsZS5wcmVzc2VkS2V5cy5zbGljZSgwKTtcbiAgdmFyIGxpc3RlbmVyR3JvdXBzID0gdGhpcy5fZ2V0R3JvdXBlZExpc3RlbmVycygpO1xuXG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0ZW5lckdyb3Vwcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIHZhciBsaXN0ZW5lcnMgPSBsaXN0ZW5lckdyb3Vwc1tpXTtcbiAgICB2YXIga2V5Q29tYm8gID0gbGlzdGVuZXJzWzBdLmtleUNvbWJvO1xuXG4gICAgaWYgKGtleUNvbWJvID09PSBudWxsIHx8IGtleUNvbWJvLmNoZWNrKHByZXNzZWRLZXlzKSkge1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBsaXN0ZW5lcnMubGVuZ3RoOyBqICs9IDEpIHtcbiAgICAgICAgdmFyIGxpc3RlbmVyID0gbGlzdGVuZXJzW2pdO1xuXG4gICAgICAgIGlmIChrZXlDb21ibyA9PT0gbnVsbCkge1xuICAgICAgICAgIGxpc3RlbmVyID0ge1xuICAgICAgICAgICAga2V5Q29tYm8gICAgICAgICAgICAgICA6IG5ldyBLZXlDb21ibyhwcmVzc2VkS2V5cy5qb2luKCcrJykpLFxuICAgICAgICAgICAgcHJlc3NIYW5kbGVyICAgICAgICAgICA6IGxpc3RlbmVyLnByZXNzSGFuZGxlcixcbiAgICAgICAgICAgIHJlbGVhc2VIYW5kbGVyICAgICAgICAgOiBsaXN0ZW5lci5yZWxlYXNlSGFuZGxlcixcbiAgICAgICAgICAgIHByZXZlbnRSZXBlYXQgICAgICAgICAgOiBsaXN0ZW5lci5wcmV2ZW50UmVwZWF0LFxuICAgICAgICAgICAgcHJldmVudFJlcGVhdEJ5RGVmYXVsdCA6IGxpc3RlbmVyLnByZXZlbnRSZXBlYXRCeURlZmF1bHRcbiAgICAgICAgICB9O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxpc3RlbmVyLnByZXNzSGFuZGxlciAmJiAhbGlzdGVuZXIucHJldmVudFJlcGVhdCkge1xuICAgICAgICAgIGxpc3RlbmVyLnByZXNzSGFuZGxlci5jYWxsKHRoaXMsIGV2ZW50KTtcbiAgICAgICAgICBpZiAocHJldmVudFJlcGVhdCkge1xuICAgICAgICAgICAgbGlzdGVuZXIucHJldmVudFJlcGVhdCA9IHByZXZlbnRSZXBlYXQ7XG4gICAgICAgICAgICBwcmV2ZW50UmVwZWF0ICAgICAgICAgID0gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxpc3RlbmVyLnJlbGVhc2VIYW5kbGVyICYmIHRoaXMuX2FwcGxpZWRMaXN0ZW5lcnMuaW5kZXhPZihsaXN0ZW5lcikgPT09IC0xKSB7XG4gICAgICAgICAgdGhpcy5fYXBwbGllZExpc3RlbmVycy5wdXNoKGxpc3RlbmVyKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoa2V5Q29tYm8pIHtcbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlDb21iby5rZXlOYW1lcy5sZW5ndGg7IGogKz0gMSkge1xuICAgICAgICAgIHZhciBpbmRleCA9IHByZXNzZWRLZXlzLmluZGV4T2Yoa2V5Q29tYm8ua2V5TmFtZXNbal0pO1xuICAgICAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgIHByZXNzZWRLZXlzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICBqIC09IDE7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5LZXlib2FyZC5wcm90b3R5cGUuX2NsZWFyQmluZGluZ3MgPSBmdW5jdGlvbihldmVudCkge1xuICBldmVudCB8fCAoZXZlbnQgPSB7fSk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9hcHBsaWVkTGlzdGVuZXJzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgdmFyIGxpc3RlbmVyID0gdGhpcy5fYXBwbGllZExpc3RlbmVyc1tpXTtcbiAgICB2YXIga2V5Q29tYm8gPSBsaXN0ZW5lci5rZXlDb21ibztcbiAgICBpZiAoa2V5Q29tYm8gPT09IG51bGwgfHwgIWtleUNvbWJvLmNoZWNrKHRoaXMuX2xvY2FsZS5wcmVzc2VkS2V5cykpIHtcbiAgICAgIGlmICh0aGlzLl9jYWxsZXJIYW5kbGVyICE9PSBsaXN0ZW5lci5yZWxlYXNlSGFuZGxlcikge1xuICAgICAgICB2YXIgb2xkQ2FsbGVyID0gdGhpcy5fY2FsbGVySGFuZGxlcjtcbiAgICAgICAgdGhpcy5fY2FsbGVySGFuZGxlciA9IGxpc3RlbmVyLnJlbGVhc2VIYW5kbGVyO1xuICAgICAgICBsaXN0ZW5lci5wcmV2ZW50UmVwZWF0ID0gbGlzdGVuZXIucHJldmVudFJlcGVhdEJ5RGVmYXVsdDtcbiAgICAgICAgbGlzdGVuZXIucmVsZWFzZUhhbmRsZXIuY2FsbCh0aGlzLCBldmVudCk7XG4gICAgICAgIHRoaXMuX2NhbGxlckhhbmRsZXIgPSBvbGRDYWxsZXI7XG4gICAgICB9XG4gICAgICB0aGlzLl9hcHBsaWVkTGlzdGVuZXJzLnNwbGljZShpLCAxKTtcbiAgICAgIGkgLT0gMTtcbiAgICB9XG4gIH1cbn07XG5cbktleWJvYXJkLnByb3RvdHlwZS5faGFuZGxlQ29tbWFuZEJ1ZyA9IGZ1bmN0aW9uKGV2ZW50LCBwbGF0Zm9ybSkge1xuICAvLyBPbiBNYWMgd2hlbiB0aGUgY29tbWFuZCBrZXkgaXMga2VwdCBwcmVzc2VkLCBrZXl1cCBpcyBub3QgdHJpZ2dlcmVkIGZvciBhbnkgb3RoZXIga2V5LlxuICAvLyBJbiB0aGlzIGNhc2UgZm9yY2UgYSBrZXl1cCBmb3Igbm9uLW1vZGlmaWVyIGtleXMgZGlyZWN0bHkgYWZ0ZXIgdGhlIGtleXByZXNzLlxuICB2YXIgbW9kaWZpZXJLZXlzID0gW1wic2hpZnRcIiwgXCJjdHJsXCIsIFwiYWx0XCIsIFwiY2Fwc2xvY2tcIiwgXCJ0YWJcIiwgXCJjb21tYW5kXCJdO1xuICBpZiAocGxhdGZvcm0ubWF0Y2goXCJNYWNcIikgJiYgdGhpcy5fbG9jYWxlLnByZXNzZWRLZXlzLmluY2x1ZGVzKFwiY29tbWFuZFwiKSAmJlxuICAgICAgIW1vZGlmaWVyS2V5cy5pbmNsdWRlcyh0aGlzLl9sb2NhbGUuZ2V0S2V5TmFtZXMoZXZlbnQua2V5Q29kZSlbMF0pKSB7XG4gICAgdGhpcy5fdGFyZ2V0S2V5VXBCaW5kaW5nKGV2ZW50KTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBLZXlib2FyZDtcbiIsIlxudmFyIEtleUNvbWJvID0gcmVxdWlyZSgnLi9rZXktY29tYm8nKTtcblxuXG5mdW5jdGlvbiBMb2NhbGUobmFtZSkge1xuICB0aGlzLmxvY2FsZU5hbWUgICAgID0gbmFtZTtcbiAgdGhpcy5wcmVzc2VkS2V5cyAgICA9IFtdO1xuICB0aGlzLl9hcHBsaWVkTWFjcm9zID0gW107XG4gIHRoaXMuX2tleU1hcCAgICAgICAgPSB7fTtcbiAgdGhpcy5fa2lsbEtleUNvZGVzICA9IFtdO1xuICB0aGlzLl9tYWNyb3MgICAgICAgID0gW107XG59XG5cbkxvY2FsZS5wcm90b3R5cGUuYmluZEtleUNvZGUgPSBmdW5jdGlvbihrZXlDb2RlLCBrZXlOYW1lcykge1xuICBpZiAodHlwZW9mIGtleU5hbWVzID09PSAnc3RyaW5nJykge1xuICAgIGtleU5hbWVzID0gW2tleU5hbWVzXTtcbiAgfVxuXG4gIHRoaXMuX2tleU1hcFtrZXlDb2RlXSA9IGtleU5hbWVzO1xufTtcblxuTG9jYWxlLnByb3RvdHlwZS5iaW5kTWFjcm8gPSBmdW5jdGlvbihrZXlDb21ib1N0ciwga2V5TmFtZXMpIHtcbiAgaWYgKHR5cGVvZiBrZXlOYW1lcyA9PT0gJ3N0cmluZycpIHtcbiAgICBrZXlOYW1lcyA9IFsga2V5TmFtZXMgXTtcbiAgfVxuXG4gIHZhciBoYW5kbGVyID0gbnVsbDtcbiAgaWYgKHR5cGVvZiBrZXlOYW1lcyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIGhhbmRsZXIgPSBrZXlOYW1lcztcbiAgICBrZXlOYW1lcyA9IG51bGw7XG4gIH1cblxuICB2YXIgbWFjcm8gPSB7XG4gICAga2V5Q29tYm8gOiBuZXcgS2V5Q29tYm8oa2V5Q29tYm9TdHIpLFxuICAgIGtleU5hbWVzIDoga2V5TmFtZXMsXG4gICAgaGFuZGxlciAgOiBoYW5kbGVyXG4gIH07XG5cbiAgdGhpcy5fbWFjcm9zLnB1c2gobWFjcm8pO1xufTtcblxuTG9jYWxlLnByb3RvdHlwZS5nZXRLZXlDb2RlcyA9IGZ1bmN0aW9uKGtleU5hbWUpIHtcbiAgdmFyIGtleUNvZGVzID0gW107XG4gIGZvciAodmFyIGtleUNvZGUgaW4gdGhpcy5fa2V5TWFwKSB7XG4gICAgdmFyIGluZGV4ID0gdGhpcy5fa2V5TWFwW2tleUNvZGVdLmluZGV4T2Yoa2V5TmFtZSk7XG4gICAgaWYgKGluZGV4ID4gLTEpIHsga2V5Q29kZXMucHVzaChrZXlDb2RlfDApOyB9XG4gIH1cbiAgcmV0dXJuIGtleUNvZGVzO1xufTtcblxuTG9jYWxlLnByb3RvdHlwZS5nZXRLZXlOYW1lcyA9IGZ1bmN0aW9uKGtleUNvZGUpIHtcbiAgcmV0dXJuIHRoaXMuX2tleU1hcFtrZXlDb2RlXSB8fCBbXTtcbn07XG5cbkxvY2FsZS5wcm90b3R5cGUuc2V0S2lsbEtleSA9IGZ1bmN0aW9uKGtleUNvZGUpIHtcbiAgaWYgKHR5cGVvZiBrZXlDb2RlID09PSAnc3RyaW5nJykge1xuICAgIHZhciBrZXlDb2RlcyA9IHRoaXMuZ2V0S2V5Q29kZXMoa2V5Q29kZSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlDb2Rlcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgdGhpcy5zZXRLaWxsS2V5KGtleUNvZGVzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdGhpcy5fa2lsbEtleUNvZGVzLnB1c2goa2V5Q29kZSk7XG59O1xuXG5Mb2NhbGUucHJvdG90eXBlLnByZXNzS2V5ID0gZnVuY3Rpb24oa2V5Q29kZSkge1xuICBpZiAodHlwZW9mIGtleUNvZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIGtleUNvZGVzID0gdGhpcy5nZXRLZXlDb2RlcyhrZXlDb2RlKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleUNvZGVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICB0aGlzLnByZXNzS2V5KGtleUNvZGVzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdmFyIGtleU5hbWVzID0gdGhpcy5nZXRLZXlOYW1lcyhrZXlDb2RlKTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlOYW1lcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGlmICh0aGlzLnByZXNzZWRLZXlzLmluZGV4T2Yoa2V5TmFtZXNbaV0pID09PSAtMSkge1xuICAgICAgdGhpcy5wcmVzc2VkS2V5cy5wdXNoKGtleU5hbWVzW2ldKTtcbiAgICB9XG4gIH1cblxuICB0aGlzLl9hcHBseU1hY3JvcygpO1xufTtcblxuTG9jYWxlLnByb3RvdHlwZS5yZWxlYXNlS2V5ID0gZnVuY3Rpb24oa2V5Q29kZSkge1xuICBpZiAodHlwZW9mIGtleUNvZGUgPT09ICdzdHJpbmcnKSB7XG4gICAgdmFyIGtleUNvZGVzID0gdGhpcy5nZXRLZXlDb2RlcyhrZXlDb2RlKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleUNvZGVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICB0aGlzLnJlbGVhc2VLZXkoa2V5Q29kZXNbaV0pO1xuICAgIH1cbiAgfVxuXG4gIGVsc2Uge1xuICAgIHZhciBrZXlOYW1lcyAgICAgICAgID0gdGhpcy5nZXRLZXlOYW1lcyhrZXlDb2RlKTtcbiAgICB2YXIga2lsbEtleUNvZGVJbmRleCA9IHRoaXMuX2tpbGxLZXlDb2Rlcy5pbmRleE9mKGtleUNvZGUpO1xuICAgIFxuICAgIGlmIChraWxsS2V5Q29kZUluZGV4ID4gLTEpIHtcbiAgICAgIHRoaXMucHJlc3NlZEtleXMubGVuZ3RoID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlOYW1lcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICB2YXIgaW5kZXggPSB0aGlzLnByZXNzZWRLZXlzLmluZGV4T2Yoa2V5TmFtZXNbaV0pO1xuICAgICAgICBpZiAoaW5kZXggPiAtMSkge1xuICAgICAgICAgIHRoaXMucHJlc3NlZEtleXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX2NsZWFyTWFjcm9zKCk7XG4gIH1cbn07XG5cbkxvY2FsZS5wcm90b3R5cGUuX2FwcGx5TWFjcm9zID0gZnVuY3Rpb24oKSB7XG4gIHZhciBtYWNyb3MgPSB0aGlzLl9tYWNyb3Muc2xpY2UoMCk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbWFjcm9zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgdmFyIG1hY3JvID0gbWFjcm9zW2ldO1xuICAgIGlmIChtYWNyby5rZXlDb21iby5jaGVjayh0aGlzLnByZXNzZWRLZXlzKSkge1xuICAgICAgaWYgKG1hY3JvLmhhbmRsZXIpIHtcbiAgICAgICAgbWFjcm8ua2V5TmFtZXMgPSBtYWNyby5oYW5kbGVyKHRoaXMucHJlc3NlZEtleXMpO1xuICAgICAgfVxuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBtYWNyby5rZXlOYW1lcy5sZW5ndGg7IGogKz0gMSkge1xuICAgICAgICBpZiAodGhpcy5wcmVzc2VkS2V5cy5pbmRleE9mKG1hY3JvLmtleU5hbWVzW2pdKSA9PT0gLTEpIHtcbiAgICAgICAgICB0aGlzLnByZXNzZWRLZXlzLnB1c2gobWFjcm8ua2V5TmFtZXNbal0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLl9hcHBsaWVkTWFjcm9zLnB1c2gobWFjcm8pO1xuICAgIH1cbiAgfVxufTtcblxuTG9jYWxlLnByb3RvdHlwZS5fY2xlYXJNYWNyb3MgPSBmdW5jdGlvbigpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9hcHBsaWVkTWFjcm9zLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgdmFyIG1hY3JvID0gdGhpcy5fYXBwbGllZE1hY3Jvc1tpXTtcbiAgICBpZiAoIW1hY3JvLmtleUNvbWJvLmNoZWNrKHRoaXMucHJlc3NlZEtleXMpKSB7XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG1hY3JvLmtleU5hbWVzLmxlbmd0aDsgaiArPSAxKSB7XG4gICAgICAgIHZhciBpbmRleCA9IHRoaXMucHJlc3NlZEtleXMuaW5kZXhPZihtYWNyby5rZXlOYW1lc1tqXSk7XG4gICAgICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICAgICAgdGhpcy5wcmVzc2VkS2V5cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAobWFjcm8uaGFuZGxlcikge1xuICAgICAgICBtYWNyby5rZXlOYW1lcyA9IG51bGw7XG4gICAgICB9XG4gICAgICB0aGlzLl9hcHBsaWVkTWFjcm9zLnNwbGljZShpLCAxKTtcbiAgICAgIGkgLT0gMTtcbiAgICB9XG4gIH1cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBMb2NhbGU7XG4iLCJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obG9jYWxlLCBwbGF0Zm9ybSwgdXNlckFnZW50KSB7XG5cbiAgLy8gZ2VuZXJhbFxuICBsb2NhbGUuYmluZEtleUNvZGUoMywgICBbJ2NhbmNlbCddKTtcbiAgbG9jYWxlLmJpbmRLZXlDb2RlKDgsICAgWydiYWNrc3BhY2UnXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSg5LCAgIFsndGFiJ10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTIsICBbJ2NsZWFyJ10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTMsICBbJ2VudGVyJ10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTYsICBbJ3NoaWZ0J10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTcsICBbJ2N0cmwnXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSgxOCwgIFsnYWx0JywgJ21lbnUnXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSgxOSwgIFsncGF1c2UnLCAnYnJlYWsnXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSgyMCwgIFsnY2Fwc2xvY2snXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSgyNywgIFsnZXNjYXBlJywgJ2VzYyddKTtcbiAgbG9jYWxlLmJpbmRLZXlDb2RlKDMyLCAgWydzcGFjZScsICdzcGFjZWJhciddKTtcbiAgbG9jYWxlLmJpbmRLZXlDb2RlKDMzLCAgWydwYWdldXAnXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSgzNCwgIFsncGFnZWRvd24nXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSgzNSwgIFsnZW5kJ10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMzYsICBbJ2hvbWUnXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSgzNywgIFsnbGVmdCddKTtcbiAgbG9jYWxlLmJpbmRLZXlDb2RlKDM4LCAgWyd1cCddKTtcbiAgbG9jYWxlLmJpbmRLZXlDb2RlKDM5LCAgWydyaWdodCddKTtcbiAgbG9jYWxlLmJpbmRLZXlDb2RlKDQwLCAgWydkb3duJ10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoNDEsICBbJ3NlbGVjdCddKTtcbiAgbG9jYWxlLmJpbmRLZXlDb2RlKDQyLCAgWydwcmludHNjcmVlbiddKTtcbiAgbG9jYWxlLmJpbmRLZXlDb2RlKDQzLCAgWydleGVjdXRlJ10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoNDQsICBbJ3NuYXBzaG90J10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoNDUsICBbJ2luc2VydCcsICdpbnMnXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSg0NiwgIFsnZGVsZXRlJywgJ2RlbCddKTtcbiAgbG9jYWxlLmJpbmRLZXlDb2RlKDQ3LCAgWydoZWxwJ10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTQ1LCBbJ3Njcm9sbGxvY2snLCAnc2Nyb2xsJ10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTg3LCBbJ2VxdWFsJywgJ2VxdWFsc2lnbicsICc9J10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTg4LCBbJ2NvbW1hJywgJywnXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSgxOTAsIFsncGVyaW9kJywgJy4nXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSgxOTEsIFsnc2xhc2gnLCAnZm9yd2FyZHNsYXNoJywgJy8nXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSgxOTIsIFsnZ3JhdmVhY2NlbnQnLCAnYCddKTtcbiAgbG9jYWxlLmJpbmRLZXlDb2RlKDIxOSwgWydvcGVuYnJhY2tldCcsICdbJ10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMjIwLCBbJ2JhY2tzbGFzaCcsICdcXFxcJ10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMjIxLCBbJ2Nsb3NlYnJhY2tldCcsICddJ10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMjIyLCBbJ2Fwb3N0cm9waGUnLCAnXFwnJ10pO1xuXG4gIC8vIDAtOVxuICBsb2NhbGUuYmluZEtleUNvZGUoNDgsIFsnemVybycsICcwJ10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoNDksIFsnb25lJywgJzEnXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSg1MCwgWyd0d28nLCAnMiddKTtcbiAgbG9jYWxlLmJpbmRLZXlDb2RlKDUxLCBbJ3RocmVlJywgJzMnXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSg1MiwgWydmb3VyJywgJzQnXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSg1MywgWydmaXZlJywgJzUnXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSg1NCwgWydzaXgnLCAnNiddKTtcbiAgbG9jYWxlLmJpbmRLZXlDb2RlKDU1LCBbJ3NldmVuJywgJzcnXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSg1NiwgWydlaWdodCcsICc4J10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoNTcsIFsnbmluZScsICc5J10pO1xuXG4gIC8vIG51bXBhZFxuICBsb2NhbGUuYmluZEtleUNvZGUoOTYsIFsnbnVtemVybycsICdudW0wJ10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoOTcsIFsnbnVtb25lJywgJ251bTEnXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSg5OCwgWydudW10d28nLCAnbnVtMiddKTtcbiAgbG9jYWxlLmJpbmRLZXlDb2RlKDk5LCBbJ251bXRocmVlJywgJ251bTMnXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSgxMDAsIFsnbnVtZm91cicsICdudW00J10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTAxLCBbJ251bWZpdmUnLCAnbnVtNSddKTtcbiAgbG9jYWxlLmJpbmRLZXlDb2RlKDEwMiwgWydudW1zaXgnLCAnbnVtNiddKTtcbiAgbG9jYWxlLmJpbmRLZXlDb2RlKDEwMywgWydudW1zZXZlbicsICdudW03J10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTA0LCBbJ251bWVpZ2h0JywgJ251bTgnXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSgxMDUsIFsnbnVtbmluZScsICdudW05J10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTA2LCBbJ251bW11bHRpcGx5JywgJ251bSonXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSgxMDcsIFsnbnVtYWRkJywgJ251bSsnXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSgxMDgsIFsnbnVtZW50ZXInXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSgxMDksIFsnbnVtc3VidHJhY3QnLCAnbnVtLSddKTtcbiAgbG9jYWxlLmJpbmRLZXlDb2RlKDExMCwgWydudW1kZWNpbWFsJywgJ251bS4nXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSgxMTEsIFsnbnVtZGl2aWRlJywgJ251bS8nXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSgxNDQsIFsnbnVtbG9jaycsICdudW0nXSk7XG5cbiAgLy8gZnVuY3Rpb24ga2V5c1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTEyLCBbJ2YxJ10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTEzLCBbJ2YyJ10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTE0LCBbJ2YzJ10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTE1LCBbJ2Y0J10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTE2LCBbJ2Y1J10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTE3LCBbJ2Y2J10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTE4LCBbJ2Y3J10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTE5LCBbJ2Y4J10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTIwLCBbJ2Y5J10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoMTIxLCBbJ2YxMCddKTtcbiAgbG9jYWxlLmJpbmRLZXlDb2RlKDEyMiwgWydmMTEnXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZSgxMjMsIFsnZjEyJ10pO1xuXG4gIC8vIHNlY29uZGFyeSBrZXkgc3ltYm9sc1xuICBsb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIGAnLCBbJ3RpbGRlJywgJ34nXSk7XG4gIGxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgMScsIFsnZXhjbGFtYXRpb24nLCAnZXhjbGFtYXRpb25wb2ludCcsICchJ10pO1xuICBsb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDInLCBbJ2F0JywgJ0AnXSk7XG4gIGxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgMycsIFsnbnVtYmVyJywgJyMnXSk7XG4gIGxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgNCcsIFsnZG9sbGFyJywgJ2RvbGxhcnMnLCAnZG9sbGFyc2lnbicsICckJ10pO1xuICBsb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDUnLCBbJ3BlcmNlbnQnLCAnJSddKTtcbiAgbG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyA2JywgWydjYXJldCcsICdeJ10pO1xuICBsb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDcnLCBbJ2FtcGVyc2FuZCcsICdhbmQnLCAnJiddKTtcbiAgbG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyA4JywgWydhc3RlcmlzaycsICcqJ10pO1xuICBsb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDknLCBbJ29wZW5wYXJlbicsICcoJ10pO1xuICBsb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDAnLCBbJ2Nsb3NlcGFyZW4nLCAnKSddKTtcbiAgbG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAtJywgWyd1bmRlcnNjb3JlJywgJ18nXSk7XG4gIGxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgPScsIFsncGx1cycsICcrJ10pO1xuICBsb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIFsnLCBbJ29wZW5jdXJseWJyYWNlJywgJ29wZW5jdXJseWJyYWNrZXQnLCAneyddKTtcbiAgbG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyBdJywgWydjbG9zZWN1cmx5YnJhY2UnLCAnY2xvc2VjdXJseWJyYWNrZXQnLCAnfSddKTtcbiAgbG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyBcXFxcJywgWyd2ZXJ0aWNhbGJhcicsICd8J10pO1xuICBsb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIDsnLCBbJ2NvbG9uJywgJzonXSk7XG4gIGxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgXFwnJywgWydxdW90YXRpb25tYXJrJywgJ1xcJyddKTtcbiAgbG9jYWxlLmJpbmRNYWNybygnc2hpZnQgKyAhLCcsIFsnb3BlbmFuZ2xlYnJhY2tldCcsICc8J10pO1xuICBsb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArIC4nLCBbJ2Nsb3NlYW5nbGVicmFja2V0JywgJz4nXSk7XG4gIGxvY2FsZS5iaW5kTWFjcm8oJ3NoaWZ0ICsgLycsIFsncXVlc3Rpb25tYXJrJywgJz8nXSk7XG4gIFxuICBpZiAocGxhdGZvcm0ubWF0Y2goJ01hYycpKSB7XG4gICAgbG9jYWxlLmJpbmRNYWNybygnY29tbWFuZCcsIFsnbW9kJywgJ21vZGlmaWVyJ10pO1xuICB9IGVsc2Uge1xuICAgIGxvY2FsZS5iaW5kTWFjcm8oJ2N0cmwnLCBbJ21vZCcsICdtb2RpZmllciddKTtcbiAgfVxuXG4gIC8vYS16IGFuZCBBLVpcbiAgZm9yICh2YXIga2V5Q29kZSA9IDY1OyBrZXlDb2RlIDw9IDkwOyBrZXlDb2RlICs9IDEpIHtcbiAgICB2YXIga2V5TmFtZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoa2V5Q29kZSArIDMyKTtcbiAgICB2YXIgY2FwaXRhbEtleU5hbWUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGtleUNvZGUpO1xuICBcdGxvY2FsZS5iaW5kS2V5Q29kZShrZXlDb2RlLCBrZXlOYW1lKTtcbiAgXHRsb2NhbGUuYmluZE1hY3JvKCdzaGlmdCArICcgKyBrZXlOYW1lLCBjYXBpdGFsS2V5TmFtZSk7XG4gIFx0bG9jYWxlLmJpbmRNYWNybygnY2Fwc2xvY2sgKyAnICsga2V5TmFtZSwgY2FwaXRhbEtleU5hbWUpO1xuICB9XG5cbiAgLy8gYnJvd3NlciBjYXZlYXRzXG4gIHZhciBzZW1pY29sb25LZXlDb2RlID0gdXNlckFnZW50Lm1hdGNoKCdGaXJlZm94JykgPyA1OSAgOiAxODY7XG4gIHZhciBkYXNoS2V5Q29kZSAgICAgID0gdXNlckFnZW50Lm1hdGNoKCdGaXJlZm94JykgPyAxNzMgOiAxODk7XG4gIHZhciBsZWZ0Q29tbWFuZEtleUNvZGU7XG4gIHZhciByaWdodENvbW1hbmRLZXlDb2RlO1xuICBpZiAocGxhdGZvcm0ubWF0Y2goJ01hYycpICYmICh1c2VyQWdlbnQubWF0Y2goJ1NhZmFyaScpIHx8IHVzZXJBZ2VudC5tYXRjaCgnQ2hyb21lJykpKSB7XG4gICAgbGVmdENvbW1hbmRLZXlDb2RlICA9IDkxO1xuICAgIHJpZ2h0Q29tbWFuZEtleUNvZGUgPSA5MztcbiAgfSBlbHNlIGlmKHBsYXRmb3JtLm1hdGNoKCdNYWMnKSAmJiB1c2VyQWdlbnQubWF0Y2goJ09wZXJhJykpIHtcbiAgICBsZWZ0Q29tbWFuZEtleUNvZGUgID0gMTc7XG4gICAgcmlnaHRDb21tYW5kS2V5Q29kZSA9IDE3O1xuICB9IGVsc2UgaWYocGxhdGZvcm0ubWF0Y2goJ01hYycpICYmIHVzZXJBZ2VudC5tYXRjaCgnRmlyZWZveCcpKSB7XG4gICAgbGVmdENvbW1hbmRLZXlDb2RlICA9IDIyNDtcbiAgICByaWdodENvbW1hbmRLZXlDb2RlID0gMjI0O1xuICB9XG4gIGxvY2FsZS5iaW5kS2V5Q29kZShzZW1pY29sb25LZXlDb2RlLCAgICBbJ3NlbWljb2xvbicsICc7J10pO1xuICBsb2NhbGUuYmluZEtleUNvZGUoZGFzaEtleUNvZGUsICAgICAgICAgWydkYXNoJywgJy0nXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZShsZWZ0Q29tbWFuZEtleUNvZGUsICBbJ2NvbW1hbmQnLCAnd2luZG93cycsICd3aW4nLCAnc3VwZXInLCAnbGVmdGNvbW1hbmQnLCAnbGVmdHdpbmRvd3MnLCAnbGVmdHdpbicsICdsZWZ0c3VwZXInXSk7XG4gIGxvY2FsZS5iaW5kS2V5Q29kZShyaWdodENvbW1hbmRLZXlDb2RlLCBbJ2NvbW1hbmQnLCAnd2luZG93cycsICd3aW4nLCAnc3VwZXInLCAncmlnaHRjb21tYW5kJywgJ3JpZ2h0d2luZG93cycsICdyaWdodHdpbicsICdyaWdodHN1cGVyJ10pO1xuXG4gIC8vIGtpbGwga2V5c1xuICBsb2NhbGUuc2V0S2lsbEtleSgnY29tbWFuZCcpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc3ViamVjdCkge1xuICB2YWxpZGF0ZVN1YmplY3Qoc3ViamVjdCk7XG5cbiAgdmFyIGV2ZW50c1N0b3JhZ2UgPSBjcmVhdGVFdmVudHNTdG9yYWdlKHN1YmplY3QpO1xuICBzdWJqZWN0Lm9uID0gZXZlbnRzU3RvcmFnZS5vbjtcbiAgc3ViamVjdC5vZmYgPSBldmVudHNTdG9yYWdlLm9mZjtcbiAgc3ViamVjdC5maXJlID0gZXZlbnRzU3RvcmFnZS5maXJlO1xuICByZXR1cm4gc3ViamVjdDtcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZUV2ZW50c1N0b3JhZ2Uoc3ViamVjdCkge1xuICAvLyBTdG9yZSBhbGwgZXZlbnQgbGlzdGVuZXJzIHRvIHRoaXMgaGFzaC4gS2V5IGlzIGV2ZW50IG5hbWUsIHZhbHVlIGlzIGFycmF5XG4gIC8vIG9mIGNhbGxiYWNrIHJlY29yZHMuXG4gIC8vXG4gIC8vIEEgY2FsbGJhY2sgcmVjb3JkIGNvbnNpc3RzIG9mIGNhbGxiYWNrIGZ1bmN0aW9uIGFuZCBpdHMgb3B0aW9uYWwgY29udGV4dDpcbiAgLy8geyAnZXZlbnROYW1lJyA9PiBbe2NhbGxiYWNrOiBmdW5jdGlvbiwgY3R4OiBvYmplY3R9XSB9XG4gIHZhciByZWdpc3RlcmVkRXZlbnRzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcblxuICByZXR1cm4ge1xuICAgIG9uOiBmdW5jdGlvbiAoZXZlbnROYW1lLCBjYWxsYmFjaywgY3R4KSB7XG4gICAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignY2FsbGJhY2sgaXMgZXhwZWN0ZWQgdG8gYmUgYSBmdW5jdGlvbicpO1xuICAgICAgfVxuICAgICAgdmFyIGhhbmRsZXJzID0gcmVnaXN0ZXJlZEV2ZW50c1tldmVudE5hbWVdO1xuICAgICAgaWYgKCFoYW5kbGVycykge1xuICAgICAgICBoYW5kbGVycyA9IHJlZ2lzdGVyZWRFdmVudHNbZXZlbnROYW1lXSA9IFtdO1xuICAgICAgfVxuICAgICAgaGFuZGxlcnMucHVzaCh7Y2FsbGJhY2s6IGNhbGxiYWNrLCBjdHg6IGN0eH0pO1xuXG4gICAgICByZXR1cm4gc3ViamVjdDtcbiAgICB9LFxuXG4gICAgb2ZmOiBmdW5jdGlvbiAoZXZlbnROYW1lLCBjYWxsYmFjaykge1xuICAgICAgdmFyIHdhbnRUb1JlbW92ZUFsbCA9ICh0eXBlb2YgZXZlbnROYW1lID09PSAndW5kZWZpbmVkJyk7XG4gICAgICBpZiAod2FudFRvUmVtb3ZlQWxsKSB7XG4gICAgICAgIC8vIEtpbGxpbmcgb2xkIGV2ZW50cyBzdG9yYWdlIHNob3VsZCBiZSBlbm91Z2ggaW4gdGhpcyBjYXNlOlxuICAgICAgICByZWdpc3RlcmVkRXZlbnRzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgICAgcmV0dXJuIHN1YmplY3Q7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZWdpc3RlcmVkRXZlbnRzW2V2ZW50TmFtZV0pIHtcbiAgICAgICAgdmFyIGRlbGV0ZUFsbENhbGxiYWNrc0ZvckV2ZW50ID0gKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJyk7XG4gICAgICAgIGlmIChkZWxldGVBbGxDYWxsYmFja3NGb3JFdmVudCkge1xuICAgICAgICAgIGRlbGV0ZSByZWdpc3RlcmVkRXZlbnRzW2V2ZW50TmFtZV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIGNhbGxiYWNrcyA9IHJlZ2lzdGVyZWRFdmVudHNbZXZlbnROYW1lXTtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNhbGxiYWNrcy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrc1tpXS5jYWxsYmFjayA9PT0gY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2tzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHN1YmplY3Q7XG4gICAgfSxcblxuICAgIGZpcmU6IGZ1bmN0aW9uIChldmVudE5hbWUpIHtcbiAgICAgIHZhciBjYWxsYmFja3MgPSByZWdpc3RlcmVkRXZlbnRzW2V2ZW50TmFtZV07XG4gICAgICBpZiAoIWNhbGxiYWNrcykge1xuICAgICAgICByZXR1cm4gc3ViamVjdDtcbiAgICAgIH1cblxuICAgICAgdmFyIGZpcmVBcmd1bWVudHM7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZmlyZUFyZ3VtZW50cyA9IEFycmF5LnByb3RvdHlwZS5zcGxpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgfVxuICAgICAgZm9yKHZhciBpID0gMDsgaSA8IGNhbGxiYWNrcy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgY2FsbGJhY2tJbmZvID0gY2FsbGJhY2tzW2ldO1xuICAgICAgICBjYWxsYmFja0luZm8uY2FsbGJhY2suYXBwbHkoY2FsbGJhY2tJbmZvLmN0eCwgZmlyZUFyZ3VtZW50cyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBzdWJqZWN0O1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVTdWJqZWN0KHN1YmplY3QpIHtcbiAgaWYgKCFzdWJqZWN0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdFdmVudGlmeSBjYW5ub3QgdXNlIGZhbHN5IG9iamVjdCBhcyBldmVudHMgc3ViamVjdCcpO1xuICB9XG4gIHZhciByZXNlcnZlZFdvcmRzID0gWydvbicsICdmaXJlJywgJ29mZiddO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHJlc2VydmVkV29yZHMubGVuZ3RoOyArK2kpIHtcbiAgICBpZiAoc3ViamVjdC5oYXNPd25Qcm9wZXJ0eShyZXNlcnZlZFdvcmRzW2ldKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU3ViamVjdCBjYW5ub3QgYmUgZXZlbnRpZmllZCwgc2luY2UgaXQgYWxyZWFkeSBoYXMgcHJvcGVydHkgJ1wiICsgcmVzZXJ2ZWRXb3Jkc1tpXSArIFwiJ1wiKTtcbiAgICB9XG4gIH1cbn1cbiIsIi8qKlxuICogQGZpbGVPdmVydmlldyBDb250YWlucyBkZWZpbml0aW9uIG9mIHRoZSBjb3JlIGdyYXBoIG9iamVjdC5cbiAqL1xuXG4vLyBUT0RPOiBuZWVkIHRvIGNoYW5nZSBzdG9yYWdlIGxheWVyOlxuLy8gMS4gQmUgYWJsZSB0byBnZXQgYWxsIG5vZGVzIE8oMSlcbi8vIDIuIEJlIGFibGUgdG8gZ2V0IG51bWJlciBvZiBsaW5rcyBPKDEpXG5cbi8qKlxuICogQGV4YW1wbGVcbiAqICB2YXIgZ3JhcGggPSByZXF1aXJlKCduZ3JhcGguZ3JhcGgnKSgpO1xuICogIGdyYXBoLmFkZE5vZGUoMSk7ICAgICAvLyBncmFwaCBoYXMgb25lIG5vZGUuXG4gKiAgZ3JhcGguYWRkTGluaygyLCAzKTsgIC8vIG5vdyBncmFwaCBjb250YWlucyB0aHJlZSBub2RlcyBhbmQgb25lIGxpbmsuXG4gKlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZUdyYXBoO1xuXG52YXIgZXZlbnRpZnkgPSByZXF1aXJlKCduZ3JhcGguZXZlbnRzJyk7XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBncmFwaFxuICovXG5mdW5jdGlvbiBjcmVhdGVHcmFwaChvcHRpb25zKSB7XG4gIC8vIEdyYXBoIHN0cnVjdHVyZSBpcyBtYWludGFpbmVkIGFzIGRpY3Rpb25hcnkgb2Ygbm9kZXNcbiAgLy8gYW5kIGFycmF5IG9mIGxpbmtzLiBFYWNoIG5vZGUgaGFzICdsaW5rcycgcHJvcGVydHkgd2hpY2hcbiAgLy8gaG9sZCBhbGwgbGlua3MgcmVsYXRlZCB0byB0aGF0IG5vZGUuIEFuZCBnZW5lcmFsIGxpbmtzXG4gIC8vIGFycmF5IGlzIHVzZWQgdG8gc3BlZWQgdXAgYWxsIGxpbmtzIGVudW1lcmF0aW9uLiBUaGlzIGlzIGluZWZmaWNpZW50XG4gIC8vIGluIHRlcm1zIG9mIG1lbW9yeSwgYnV0IHNpbXBsaWZpZXMgY29kaW5nLlxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgaWYgKCd1bmlxdWVMaW5rSWQnIGluIG9wdGlvbnMpIHtcbiAgICBjb25zb2xlLndhcm4oXG4gICAgICAnbmdyYXBoLmdyYXBoOiBTdGFydGluZyBmcm9tIHZlcnNpb24gMC4xNCBgdW5pcXVlTGlua0lkYCBpcyBkZXByZWNhdGVkLlxcbicgK1xuICAgICAgJ1VzZSBgbXVsdGlncmFwaGAgb3B0aW9uIGluc3RlYWRcXG4nLFxuICAgICAgJ1xcbicsXG4gICAgICAnTm90ZTogdGhlcmUgaXMgYWxzbyBjaGFuZ2UgaW4gZGVmYXVsdCBiZWhhdmlvcjogRnJvbSBub3cgb3duIGVhY2ggZ3JhcGhcXG4nK1xuICAgICAgJ2lzIGNvbnNpZGVyZWQgdG8gYmUgbm90IGEgbXVsdGlncmFwaCBieSBkZWZhdWx0IChlYWNoIGVkZ2UgaXMgdW5pcXVlKS4nXG4gICAgKTtcblxuICAgIG9wdGlvbnMubXVsdGlncmFwaCA9IG9wdGlvbnMudW5pcXVlTGlua0lkO1xuICB9XG5cbiAgLy8gRGVhciByZWFkZXIsIHRoZSBub24tbXVsdGlncmFwaHMgZG8gbm90IGd1YXJhbnRlZSB0aGF0IHRoZXJlIGlzIG9ubHlcbiAgLy8gb25lIGxpbmsgZm9yIGEgZ2l2ZW4gcGFpciBvZiBub2RlLiBXaGVuIHRoaXMgb3B0aW9uIGlzIHNldCB0byBmYWxzZVxuICAvLyB3ZSBjYW4gc2F2ZSBzb21lIG1lbW9yeSBhbmQgQ1BVICgxOCUgZmFzdGVyIGZvciBub24tbXVsdGlncmFwaCk7XG4gIGlmIChvcHRpb25zLm11bHRpZ3JhcGggPT09IHVuZGVmaW5lZCkgb3B0aW9ucy5tdWx0aWdyYXBoID0gZmFsc2U7XG5cbiAgdmFyIG5vZGVzID0gdHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicgPyBPYmplY3QuY3JlYXRlKG51bGwpIDoge30sXG4gICAgbGlua3MgPSBbXSxcbiAgICAvLyBIYXNoIG9mIG11bHRpLWVkZ2VzLiBVc2VkIHRvIHRyYWNrIGlkcyBvZiBlZGdlcyBiZXR3ZWVuIHNhbWUgbm9kZXNcbiAgICBtdWx0aUVkZ2VzID0ge30sXG4gICAgbm9kZXNDb3VudCA9IDAsXG4gICAgc3VzcGVuZEV2ZW50cyA9IDAsXG5cbiAgICBmb3JFYWNoTm9kZSA9IGNyZWF0ZU5vZGVJdGVyYXRvcigpLFxuICAgIGNyZWF0ZUxpbmsgPSBvcHRpb25zLm11bHRpZ3JhcGggPyBjcmVhdGVVbmlxdWVMaW5rIDogY3JlYXRlU2luZ2xlTGluayxcblxuICAgIC8vIE91ciBncmFwaCBBUEkgcHJvdmlkZXMgbWVhbnMgdG8gbGlzdGVuIHRvIGdyYXBoIGNoYW5nZXMuIFVzZXJzIGNhbiBzdWJzY3JpYmVcbiAgICAvLyB0byBiZSBub3RpZmllZCBhYm91dCBjaGFuZ2VzIGluIHRoZSBncmFwaCBieSB1c2luZyBgb25gIG1ldGhvZC4gSG93ZXZlclxuICAgIC8vIGluIHNvbWUgY2FzZXMgdGhleSBkb24ndCB1c2UgaXQuIFRvIGF2b2lkIHVubmVjZXNzYXJ5IG1lbW9yeSBjb25zdW1wdGlvblxuICAgIC8vIHdlIHdpbGwgbm90IHJlY29yZCBncmFwaCBjaGFuZ2VzIHVudGlsIHdlIGhhdmUgYXQgbGVhc3Qgb25lIHN1YnNjcmliZXIuXG4gICAgLy8gQ29kZSBiZWxvdyBzdXBwb3J0cyB0aGlzIG9wdGltaXphdGlvbi5cbiAgICAvL1xuICAgIC8vIEFjY3VtdWxhdGVzIGFsbCBjaGFuZ2VzIG1hZGUgZHVyaW5nIGdyYXBoIHVwZGF0ZXMuXG4gICAgLy8gRWFjaCBjaGFuZ2UgZWxlbWVudCBjb250YWluczpcbiAgICAvLyAgY2hhbmdlVHlwZSAtIG9uZSBvZiB0aGUgc3RyaW5nczogJ2FkZCcsICdyZW1vdmUnIG9yICd1cGRhdGUnO1xuICAgIC8vICBub2RlIC0gaWYgY2hhbmdlIGlzIHJlbGF0ZWQgdG8gbm9kZSB0aGlzIHByb3BlcnR5IGlzIHNldCB0byBjaGFuZ2VkIGdyYXBoJ3Mgbm9kZTtcbiAgICAvLyAgbGluayAtIGlmIGNoYW5nZSBpcyByZWxhdGVkIHRvIGxpbmsgdGhpcyBwcm9wZXJ0eSBpcyBzZXQgdG8gY2hhbmdlZCBncmFwaCdzIGxpbms7XG4gICAgY2hhbmdlcyA9IFtdLFxuICAgIHJlY29yZExpbmtDaGFuZ2UgPSBub29wLFxuICAgIHJlY29yZE5vZGVDaGFuZ2UgPSBub29wLFxuICAgIGVudGVyTW9kaWZpY2F0aW9uID0gbm9vcCxcbiAgICBleGl0TW9kaWZpY2F0aW9uID0gbm9vcDtcblxuICAvLyB0aGlzIGlzIG91ciBwdWJsaWMgQVBJOlxuICB2YXIgZ3JhcGhQYXJ0ID0ge1xuICAgIC8qKlxuICAgICAqIEFkZHMgbm9kZSB0byB0aGUgZ3JhcGguIElmIG5vZGUgd2l0aCBnaXZlbiBpZCBhbHJlYWR5IGV4aXN0cyBpbiB0aGUgZ3JhcGhcbiAgICAgKiBpdHMgZGF0YSBpcyBleHRlbmRlZCB3aXRoIHdoYXRldmVyIGNvbWVzIGluICdkYXRhJyBhcmd1bWVudC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBub2RlSWQgdGhlIG5vZGUncyBpZGVudGlmaWVyLiBBIHN0cmluZyBvciBudW1iZXIgaXMgcHJlZmVycmVkLlxuICAgICAqIEBwYXJhbSBbZGF0YV0gYWRkaXRpb25hbCBkYXRhIGZvciB0aGUgbm9kZSBiZWluZyBhZGRlZC4gSWYgbm9kZSBhbHJlYWR5XG4gICAgICogICBleGlzdHMgaXRzIGRhdGEgb2JqZWN0IGlzIGF1Z21lbnRlZCB3aXRoIHRoZSBuZXcgb25lLlxuICAgICAqXG4gICAgICogQHJldHVybiB7bm9kZX0gVGhlIG5ld2x5IGFkZGVkIG5vZGUgb3Igbm9kZSB3aXRoIGdpdmVuIGlkIGlmIGl0IGFscmVhZHkgZXhpc3RzLlxuICAgICAqL1xuICAgIGFkZE5vZGU6IGFkZE5vZGUsXG5cbiAgICAvKipcbiAgICAgKiBBZGRzIGEgbGluayB0byB0aGUgZ3JhcGguIFRoZSBmdW5jdGlvbiBhbHdheXMgY3JlYXRlIGEgbmV3XG4gICAgICogbGluayBiZXR3ZWVuIHR3byBub2Rlcy4gSWYgb25lIG9mIHRoZSBub2RlcyBkb2VzIG5vdCBleGlzdHNcbiAgICAgKiBhIG5ldyBub2RlIGlzIGNyZWF0ZWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gZnJvbUlkIGxpbmsgc3RhcnQgbm9kZSBpZDtcbiAgICAgKiBAcGFyYW0gdG9JZCBsaW5rIGVuZCBub2RlIGlkO1xuICAgICAqIEBwYXJhbSBbZGF0YV0gYWRkaXRpb25hbCBkYXRhIHRvIGJlIHNldCBvbiB0aGUgbmV3IGxpbms7XG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHtsaW5rfSBUaGUgbmV3bHkgY3JlYXRlZCBsaW5rXG4gICAgICovXG4gICAgYWRkTGluazogYWRkTGluayxcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgbGluayBmcm9tIHRoZSBncmFwaC4gSWYgbGluayBkb2VzIG5vdCBleGlzdCBkb2VzIG5vdGhpbmcuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbGluayAtIG9iamVjdCByZXR1cm5lZCBieSBhZGRMaW5rKCkgb3IgZ2V0TGlua3MoKSBtZXRob2RzLlxuICAgICAqXG4gICAgICogQHJldHVybnMgdHJ1ZSBpZiBsaW5rIHdhcyByZW1vdmVkOyBmYWxzZSBvdGhlcndpc2UuXG4gICAgICovXG4gICAgcmVtb3ZlTGluazogcmVtb3ZlTGluayxcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgbm9kZSB3aXRoIGdpdmVuIGlkIGZyb20gdGhlIGdyYXBoLiBJZiBub2RlIGRvZXMgbm90IGV4aXN0IGluIHRoZSBncmFwaFxuICAgICAqIGRvZXMgbm90aGluZy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBub2RlSWQgbm9kZSdzIGlkZW50aWZpZXIgcGFzc2VkIHRvIGFkZE5vZGUoKSBmdW5jdGlvbi5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHRydWUgaWYgbm9kZSB3YXMgcmVtb3ZlZDsgZmFsc2Ugb3RoZXJ3aXNlLlxuICAgICAqL1xuICAgIHJlbW92ZU5vZGU6IHJlbW92ZU5vZGUsXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIG5vZGUgd2l0aCBnaXZlbiBpZGVudGlmaWVyLiBJZiBub2RlIGRvZXMgbm90IGV4aXN0IHVuZGVmaW5lZCB2YWx1ZSBpcyByZXR1cm5lZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBub2RlSWQgcmVxdWVzdGVkIG5vZGUgaWRlbnRpZmllcjtcbiAgICAgKlxuICAgICAqIEByZXR1cm4ge25vZGV9IGluIHdpdGggcmVxdWVzdGVkIGlkZW50aWZpZXIgb3IgdW5kZWZpbmVkIGlmIG5vIHN1Y2ggbm9kZSBleGlzdHMuXG4gICAgICovXG4gICAgZ2V0Tm9kZTogZ2V0Tm9kZSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgbnVtYmVyIG9mIG5vZGVzIGluIHRoaXMgZ3JhcGguXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIG51bWJlciBvZiBub2RlcyBpbiB0aGUgZ3JhcGguXG4gICAgICovXG4gICAgZ2V0Tm9kZXNDb3VudDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIG5vZGVzQ291bnQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgdG90YWwgbnVtYmVyIG9mIGxpbmtzIGluIHRoZSBncmFwaC5cbiAgICAgKi9cbiAgICBnZXRMaW5rc0NvdW50OiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gbGlua3MubGVuZ3RoO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIGFsbCBsaW5rcyAoaW5ib3VuZCBhbmQgb3V0Ym91bmQpIGZyb20gdGhlIG5vZGUgd2l0aCBnaXZlbiBpZC5cbiAgICAgKiBJZiBub2RlIHdpdGggZ2l2ZW4gaWQgaXMgbm90IGZvdW5kIG51bGwgaXMgcmV0dXJuZWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0gbm9kZUlkIHJlcXVlc3RlZCBub2RlIGlkZW50aWZpZXIuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIEFycmF5IG9mIGxpbmtzIGZyb20gYW5kIHRvIHJlcXVlc3RlZCBub2RlIGlmIHN1Y2ggbm9kZSBleGlzdHM7XG4gICAgICogICBvdGhlcndpc2UgbnVsbCBpcyByZXR1cm5lZC5cbiAgICAgKi9cbiAgICBnZXRMaW5rczogZ2V0TGlua3MsXG5cbiAgICAvKipcbiAgICAgKiBJbnZva2VzIGNhbGxiYWNrIG9uIGVhY2ggbm9kZSBvZiB0aGUgZ3JhcGguXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0Z1bmN0aW9uKG5vZGUpfSBjYWxsYmFjayBGdW5jdGlvbiB0byBiZSBpbnZva2VkLiBUaGUgZnVuY3Rpb25cbiAgICAgKiAgIGlzIHBhc3NlZCBvbmUgYXJndW1lbnQ6IHZpc2l0ZWQgbm9kZS5cbiAgICAgKi9cbiAgICBmb3JFYWNoTm9kZTogZm9yRWFjaE5vZGUsXG5cbiAgICAvKipcbiAgICAgKiBJbnZva2VzIGNhbGxiYWNrIG9uIGV2ZXJ5IGxpbmtlZCAoYWRqYWNlbnQpIG5vZGUgdG8gdGhlIGdpdmVuIG9uZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBub2RlSWQgSWRlbnRpZmllciBvZiB0aGUgcmVxdWVzdGVkIG5vZGUuXG4gICAgICogQHBhcmFtIHtGdW5jdGlvbihub2RlLCBsaW5rKX0gY2FsbGJhY2sgRnVuY3Rpb24gdG8gYmUgY2FsbGVkIG9uIGFsbCBsaW5rZWQgbm9kZXMuXG4gICAgICogICBUaGUgZnVuY3Rpb24gaXMgcGFzc2VkIHR3byBwYXJhbWV0ZXJzOiBhZGphY2VudCBub2RlIGFuZCBsaW5rIG9iamVjdCBpdHNlbGYuXG4gICAgICogQHBhcmFtIG9yaWVudGVkIGlmIHRydWUgZ3JhcGggdHJlYXRlZCBhcyBvcmllbnRlZC5cbiAgICAgKi9cbiAgICBmb3JFYWNoTGlua2VkTm9kZTogZm9yRWFjaExpbmtlZE5vZGUsXG5cbiAgICAvKipcbiAgICAgKiBFbnVtZXJhdGVzIGFsbCBsaW5rcyBpbiB0aGUgZ3JhcGhcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb24obGluayl9IGNhbGxiYWNrIEZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBvbiBhbGwgbGlua3MgaW4gdGhlIGdyYXBoLlxuICAgICAqICAgVGhlIGZ1bmN0aW9uIGlzIHBhc3NlZCBvbmUgcGFyYW1ldGVyOiBncmFwaCdzIGxpbmsgb2JqZWN0LlxuICAgICAqXG4gICAgICogTGluayBvYmplY3QgY29udGFpbnMgYXQgbGVhc3QgdGhlIGZvbGxvd2luZyBmaWVsZHM6XG4gICAgICogIGZyb21JZCAtIG5vZGUgaWQgd2hlcmUgbGluayBzdGFydHM7XG4gICAgICogIHRvSWQgLSBub2RlIGlkIHdoZXJlIGxpbmsgZW5kcyxcbiAgICAgKiAgZGF0YSAtIGFkZGl0aW9uYWwgZGF0YSBwYXNzZWQgdG8gZ3JhcGguYWRkTGluaygpIG1ldGhvZC5cbiAgICAgKi9cbiAgICBmb3JFYWNoTGluazogZm9yRWFjaExpbmssXG5cbiAgICAvKipcbiAgICAgKiBTdXNwZW5kIGFsbCBub3RpZmljYXRpb25zIGFib3V0IGdyYXBoIGNoYW5nZXMgdW50aWxcbiAgICAgKiBlbmRVcGRhdGUgaXMgY2FsbGVkLlxuICAgICAqL1xuICAgIGJlZ2luVXBkYXRlOiBlbnRlck1vZGlmaWNhdGlvbixcblxuICAgIC8qKlxuICAgICAqIFJlc3VtZXMgYWxsIG5vdGlmaWNhdGlvbnMgYWJvdXQgZ3JhcGggY2hhbmdlcyBhbmQgZmlyZXNcbiAgICAgKiBncmFwaCAnY2hhbmdlZCcgZXZlbnQgaW4gY2FzZSB0aGVyZSBhcmUgYW55IHBlbmRpbmcgY2hhbmdlcy5cbiAgICAgKi9cbiAgICBlbmRVcGRhdGU6IGV4aXRNb2RpZmljYXRpb24sXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmVzIGFsbCBub2RlcyBhbmQgbGlua3MgZnJvbSB0aGUgZ3JhcGguXG4gICAgICovXG4gICAgY2xlYXI6IGNsZWFyLFxuXG4gICAgLyoqXG4gICAgICogRGV0ZWN0cyB3aGV0aGVyIHRoZXJlIGlzIGEgbGluayBiZXR3ZWVuIHR3byBub2Rlcy5cbiAgICAgKiBPcGVyYXRpb24gY29tcGxleGl0eSBpcyBPKG4pIHdoZXJlIG4gLSBudW1iZXIgb2YgbGlua3Mgb2YgYSBub2RlLlxuICAgICAqIE5PVEU6IHRoaXMgZnVuY3Rpb24gaXMgc3lub25pbSBmb3IgZ2V0TGluaygpXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyBsaW5rIGlmIHRoZXJlIGlzIG9uZS4gbnVsbCBvdGhlcndpc2UuXG4gICAgICovXG4gICAgaGFzTGluazogZ2V0TGluayxcblxuICAgIC8qKlxuICAgICAqIERldGVjdHMgd2hldGhlciB0aGVyZSBpcyBhIG5vZGUgd2l0aCBnaXZlbiBpZFxuICAgICAqIFxuICAgICAqIE9wZXJhdGlvbiBjb21wbGV4aXR5IGlzIE8oMSlcbiAgICAgKiBOT1RFOiB0aGlzIGZ1bmN0aW9uIGlzIHN5bm9uaW0gZm9yIGdldE5vZGUoKVxuICAgICAqXG4gICAgICogQHJldHVybnMgbm9kZSBpZiB0aGVyZSBpcyBvbmU7IEZhbHN5IHZhbHVlIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBoYXNOb2RlOiBnZXROb2RlLFxuXG4gICAgLyoqXG4gICAgICogR2V0cyBhbiBlZGdlIGJldHdlZW4gdHdvIG5vZGVzLlxuICAgICAqIE9wZXJhdGlvbiBjb21wbGV4aXR5IGlzIE8obikgd2hlcmUgbiAtIG51bWJlciBvZiBsaW5rcyBvZiBhIG5vZGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZnJvbUlkIGxpbmsgc3RhcnQgaWRlbnRpZmllclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b0lkIGxpbmsgZW5kIGlkZW50aWZpZXJcbiAgICAgKlxuICAgICAqIEByZXR1cm5zIGxpbmsgaWYgdGhlcmUgaXMgb25lLiBudWxsIG90aGVyd2lzZS5cbiAgICAgKi9cbiAgICBnZXRMaW5rOiBnZXRMaW5rXG4gIH07XG5cbiAgLy8gdGhpcyB3aWxsIGFkZCBgb24oKWAgYW5kIGBmaXJlKClgIG1ldGhvZHMuXG4gIGV2ZW50aWZ5KGdyYXBoUGFydCk7XG5cbiAgbW9uaXRvclN1YnNjcmliZXJzKCk7XG5cbiAgcmV0dXJuIGdyYXBoUGFydDtcblxuICBmdW5jdGlvbiBtb25pdG9yU3Vic2NyaWJlcnMoKSB7XG4gICAgdmFyIHJlYWxPbiA9IGdyYXBoUGFydC5vbjtcblxuICAgIC8vIHJlcGxhY2UgcmVhbCBgb25gIHdpdGggb3VyIHRlbXBvcmFyeSBvbiwgd2hpY2ggd2lsbCB0cmlnZ2VyIGNoYW5nZVxuICAgIC8vIG1vZGlmaWNhdGlvbiBtb25pdG9yaW5nOlxuICAgIGdyYXBoUGFydC5vbiA9IG9uO1xuXG4gICAgZnVuY3Rpb24gb24oKSB7XG4gICAgICAvLyBub3cgaXQncyB0aW1lIHRvIHN0YXJ0IHRyYWNraW5nIHN0dWZmOlxuICAgICAgZ3JhcGhQYXJ0LmJlZ2luVXBkYXRlID0gZW50ZXJNb2RpZmljYXRpb24gPSBlbnRlck1vZGlmaWNhdGlvblJlYWw7XG4gICAgICBncmFwaFBhcnQuZW5kVXBkYXRlID0gZXhpdE1vZGlmaWNhdGlvbiA9IGV4aXRNb2RpZmljYXRpb25SZWFsO1xuICAgICAgcmVjb3JkTGlua0NoYW5nZSA9IHJlY29yZExpbmtDaGFuZ2VSZWFsO1xuICAgICAgcmVjb3JkTm9kZUNoYW5nZSA9IHJlY29yZE5vZGVDaGFuZ2VSZWFsO1xuXG4gICAgICAvLyB0aGlzIHdpbGwgcmVwbGFjZSBjdXJyZW50IGBvbmAgbWV0aG9kIHdpdGggcmVhbCBwdWIvc3ViIGZyb20gYGV2ZW50aWZ5YC5cbiAgICAgIGdyYXBoUGFydC5vbiA9IHJlYWxPbjtcbiAgICAgIC8vIGRlbGVnYXRlIHRvIHJlYWwgYG9uYCBoYW5kbGVyOlxuICAgICAgcmV0dXJuIHJlYWxPbi5hcHBseShncmFwaFBhcnQsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVjb3JkTGlua0NoYW5nZVJlYWwobGluaywgY2hhbmdlVHlwZSkge1xuICAgIGNoYW5nZXMucHVzaCh7XG4gICAgICBsaW5rOiBsaW5rLFxuICAgICAgY2hhbmdlVHlwZTogY2hhbmdlVHlwZVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVjb3JkTm9kZUNoYW5nZVJlYWwobm9kZSwgY2hhbmdlVHlwZSkge1xuICAgIGNoYW5nZXMucHVzaCh7XG4gICAgICBub2RlOiBub2RlLFxuICAgICAgY2hhbmdlVHlwZTogY2hhbmdlVHlwZVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkTm9kZShub2RlSWQsIGRhdGEpIHtcbiAgICBpZiAobm9kZUlkID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBub2RlIGlkZW50aWZpZXInKTtcbiAgICB9XG5cbiAgICBlbnRlck1vZGlmaWNhdGlvbigpO1xuXG4gICAgdmFyIG5vZGUgPSBnZXROb2RlKG5vZGVJZCk7XG4gICAgaWYgKCFub2RlKSB7XG4gICAgICBub2RlID0gbmV3IE5vZGUobm9kZUlkLCBkYXRhKTtcbiAgICAgIG5vZGVzQ291bnQrKztcbiAgICAgIHJlY29yZE5vZGVDaGFuZ2Uobm9kZSwgJ2FkZCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBub2RlLmRhdGEgPSBkYXRhO1xuICAgICAgcmVjb3JkTm9kZUNoYW5nZShub2RlLCAndXBkYXRlJyk7XG4gICAgfVxuXG4gICAgbm9kZXNbbm9kZUlkXSA9IG5vZGU7XG5cbiAgICBleGl0TW9kaWZpY2F0aW9uKCk7XG4gICAgcmV0dXJuIG5vZGU7XG4gIH1cblxuICBmdW5jdGlvbiBnZXROb2RlKG5vZGVJZCkge1xuICAgIHJldHVybiBub2Rlc1tub2RlSWRdO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlTm9kZShub2RlSWQpIHtcbiAgICB2YXIgbm9kZSA9IGdldE5vZGUobm9kZUlkKTtcbiAgICBpZiAoIW5vZGUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBlbnRlck1vZGlmaWNhdGlvbigpO1xuXG4gICAgdmFyIHByZXZMaW5rcyA9IG5vZGUubGlua3M7XG4gICAgaWYgKHByZXZMaW5rcykge1xuICAgICAgbm9kZS5saW5rcyA9IG51bGw7XG4gICAgICBmb3IodmFyIGkgPSAwOyBpIDwgcHJldkxpbmtzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHJlbW92ZUxpbmsocHJldkxpbmtzW2ldKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBkZWxldGUgbm9kZXNbbm9kZUlkXTtcbiAgICBub2Rlc0NvdW50LS07XG5cbiAgICByZWNvcmROb2RlQ2hhbmdlKG5vZGUsICdyZW1vdmUnKTtcblxuICAgIGV4aXRNb2RpZmljYXRpb24oKTtcblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cblxuICBmdW5jdGlvbiBhZGRMaW5rKGZyb21JZCwgdG9JZCwgZGF0YSkge1xuICAgIGVudGVyTW9kaWZpY2F0aW9uKCk7XG5cbiAgICB2YXIgZnJvbU5vZGUgPSBnZXROb2RlKGZyb21JZCkgfHwgYWRkTm9kZShmcm9tSWQpO1xuICAgIHZhciB0b05vZGUgPSBnZXROb2RlKHRvSWQpIHx8IGFkZE5vZGUodG9JZCk7XG5cbiAgICB2YXIgbGluayA9IGNyZWF0ZUxpbmsoZnJvbUlkLCB0b0lkLCBkYXRhKTtcblxuICAgIGxpbmtzLnB1c2gobGluayk7XG5cbiAgICAvLyBUT0RPOiB0aGlzIGlzIG5vdCBjb29sLiBPbiBsYXJnZSBncmFwaHMgcG90ZW50aWFsbHkgd291bGQgY29uc3VtZSBtb3JlIG1lbW9yeS5cbiAgICBhZGRMaW5rVG9Ob2RlKGZyb21Ob2RlLCBsaW5rKTtcbiAgICBpZiAoZnJvbUlkICE9PSB0b0lkKSB7XG4gICAgICAvLyBtYWtlIHN1cmUgd2UgYXJlIG5vdCBkdXBsaWNhdGluZyBsaW5rcyBmb3Igc2VsZi1sb29wc1xuICAgICAgYWRkTGlua1RvTm9kZSh0b05vZGUsIGxpbmspO1xuICAgIH1cblxuICAgIHJlY29yZExpbmtDaGFuZ2UobGluaywgJ2FkZCcpO1xuXG4gICAgZXhpdE1vZGlmaWNhdGlvbigpO1xuXG4gICAgcmV0dXJuIGxpbms7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVTaW5nbGVMaW5rKGZyb21JZCwgdG9JZCwgZGF0YSkge1xuICAgIHZhciBsaW5rSWQgPSBtYWtlTGlua0lkKGZyb21JZCwgdG9JZCk7XG4gICAgcmV0dXJuIG5ldyBMaW5rKGZyb21JZCwgdG9JZCwgZGF0YSwgbGlua0lkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZVVuaXF1ZUxpbmsoZnJvbUlkLCB0b0lkLCBkYXRhKSB7XG4gICAgLy8gVE9ETzogR2V0IHJpZCBvZiB0aGlzIG1ldGhvZC5cbiAgICB2YXIgbGlua0lkID0gbWFrZUxpbmtJZChmcm9tSWQsIHRvSWQpO1xuICAgIHZhciBpc011bHRpRWRnZSA9IG11bHRpRWRnZXMuaGFzT3duUHJvcGVydHkobGlua0lkKTtcbiAgICBpZiAoaXNNdWx0aUVkZ2UgfHwgZ2V0TGluayhmcm9tSWQsIHRvSWQpKSB7XG4gICAgICBpZiAoIWlzTXVsdGlFZGdlKSB7XG4gICAgICAgIG11bHRpRWRnZXNbbGlua0lkXSA9IDA7XG4gICAgICB9XG4gICAgICB2YXIgc3VmZml4ID0gJ0AnICsgKCsrbXVsdGlFZGdlc1tsaW5rSWRdKTtcbiAgICAgIGxpbmtJZCA9IG1ha2VMaW5rSWQoZnJvbUlkICsgc3VmZml4LCB0b0lkICsgc3VmZml4KTtcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IExpbmsoZnJvbUlkLCB0b0lkLCBkYXRhLCBsaW5rSWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0TGlua3Mobm9kZUlkKSB7XG4gICAgdmFyIG5vZGUgPSBnZXROb2RlKG5vZGVJZCk7XG4gICAgcmV0dXJuIG5vZGUgPyBub2RlLmxpbmtzIDogbnVsbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZUxpbmsobGluaykge1xuICAgIGlmICghbGluaykge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgaWR4ID0gaW5kZXhPZkVsZW1lbnRJbkFycmF5KGxpbmssIGxpbmtzKTtcbiAgICBpZiAoaWR4IDwgMCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGVudGVyTW9kaWZpY2F0aW9uKCk7XG5cbiAgICBsaW5rcy5zcGxpY2UoaWR4LCAxKTtcblxuICAgIHZhciBmcm9tTm9kZSA9IGdldE5vZGUobGluay5mcm9tSWQpO1xuICAgIHZhciB0b05vZGUgPSBnZXROb2RlKGxpbmsudG9JZCk7XG5cbiAgICBpZiAoZnJvbU5vZGUpIHtcbiAgICAgIGlkeCA9IGluZGV4T2ZFbGVtZW50SW5BcnJheShsaW5rLCBmcm9tTm9kZS5saW5rcyk7XG4gICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgZnJvbU5vZGUubGlua3Muc3BsaWNlKGlkeCwgMSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRvTm9kZSkge1xuICAgICAgaWR4ID0gaW5kZXhPZkVsZW1lbnRJbkFycmF5KGxpbmssIHRvTm9kZS5saW5rcyk7XG4gICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgdG9Ob2RlLmxpbmtzLnNwbGljZShpZHgsIDEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJlY29yZExpbmtDaGFuZ2UobGluaywgJ3JlbW92ZScpO1xuXG4gICAgZXhpdE1vZGlmaWNhdGlvbigpO1xuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRMaW5rKGZyb21Ob2RlSWQsIHRvTm9kZUlkKSB7XG4gICAgLy8gVE9ETzogVXNlIHNvcnRlZCBsaW5rcyB0byBzcGVlZCB0aGlzIHVwXG4gICAgdmFyIG5vZGUgPSBnZXROb2RlKGZyb21Ob2RlSWQpLFxuICAgICAgaTtcbiAgICBpZiAoIW5vZGUgfHwgIW5vZGUubGlua3MpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDA7IGkgPCBub2RlLmxpbmtzLmxlbmd0aDsgKytpKSB7XG4gICAgICB2YXIgbGluayA9IG5vZGUubGlua3NbaV07XG4gICAgICBpZiAobGluay5mcm9tSWQgPT09IGZyb21Ob2RlSWQgJiYgbGluay50b0lkID09PSB0b05vZGVJZCkge1xuICAgICAgICByZXR1cm4gbGluaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVsbDsgLy8gbm8gbGluay5cbiAgfVxuXG4gIGZ1bmN0aW9uIGNsZWFyKCkge1xuICAgIGVudGVyTW9kaWZpY2F0aW9uKCk7XG4gICAgZm9yRWFjaE5vZGUoZnVuY3Rpb24obm9kZSkge1xuICAgICAgcmVtb3ZlTm9kZShub2RlLmlkKTtcbiAgICB9KTtcbiAgICBleGl0TW9kaWZpY2F0aW9uKCk7XG4gIH1cblxuICBmdW5jdGlvbiBmb3JFYWNoTGluayhjYWxsYmFjaykge1xuICAgIHZhciBpLCBsZW5ndGg7XG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgZm9yIChpID0gMCwgbGVuZ3RoID0gbGlua3MubGVuZ3RoOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICAgICAgY2FsbGJhY2sobGlua3NbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGZvckVhY2hMaW5rZWROb2RlKG5vZGVJZCwgY2FsbGJhY2ssIG9yaWVudGVkKSB7XG4gICAgdmFyIG5vZGUgPSBnZXROb2RlKG5vZGVJZCk7XG5cbiAgICBpZiAobm9kZSAmJiBub2RlLmxpbmtzICYmIHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgaWYgKG9yaWVudGVkKSB7XG4gICAgICAgIHJldHVybiBmb3JFYWNoT3JpZW50ZWRMaW5rKG5vZGUubGlua3MsIG5vZGVJZCwgY2FsbGJhY2spO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZvckVhY2hOb25PcmllbnRlZExpbmsobm9kZS5saW5rcywgbm9kZUlkLCBjYWxsYmFjayk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZm9yRWFjaE5vbk9yaWVudGVkTGluayhsaW5rcywgbm9kZUlkLCBjYWxsYmFjaykge1xuICAgIHZhciBxdWl0RmFzdDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmtzLmxlbmd0aDsgKytpKSB7XG4gICAgICB2YXIgbGluayA9IGxpbmtzW2ldO1xuICAgICAgdmFyIGxpbmtlZE5vZGVJZCA9IGxpbmsuZnJvbUlkID09PSBub2RlSWQgPyBsaW5rLnRvSWQgOiBsaW5rLmZyb21JZDtcblxuICAgICAgcXVpdEZhc3QgPSBjYWxsYmFjayhub2Rlc1tsaW5rZWROb2RlSWRdLCBsaW5rKTtcbiAgICAgIGlmIChxdWl0RmFzdCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gQ2xpZW50IGRvZXMgbm90IG5lZWQgbW9yZSBpdGVyYXRpb25zLiBCcmVhayBub3cuXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZm9yRWFjaE9yaWVudGVkTGluayhsaW5rcywgbm9kZUlkLCBjYWxsYmFjaykge1xuICAgIHZhciBxdWl0RmFzdDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmtzLmxlbmd0aDsgKytpKSB7XG4gICAgICB2YXIgbGluayA9IGxpbmtzW2ldO1xuICAgICAgaWYgKGxpbmsuZnJvbUlkID09PSBub2RlSWQpIHtcbiAgICAgICAgcXVpdEZhc3QgPSBjYWxsYmFjayhub2Rlc1tsaW5rLnRvSWRdLCBsaW5rKTtcbiAgICAgICAgaWYgKHF1aXRGYXN0KSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7IC8vIENsaWVudCBkb2VzIG5vdCBuZWVkIG1vcmUgaXRlcmF0aW9ucy4gQnJlYWsgbm93LlxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gd2Ugd2lsbCBub3QgZmlyZSBhbnl0aGluZyB1bnRpbCB1c2VycyBvZiB0aGlzIGxpYnJhcnkgZXhwbGljaXRseSBjYWxsIGBvbigpYFxuICAvLyBtZXRob2QuXG4gIGZ1bmN0aW9uIG5vb3AoKSB7fVxuXG4gIC8vIEVudGVyLCBFeGl0IG1vZGlmaWNhdGlvbiBhbGxvd3MgYnVsayBncmFwaCB1cGRhdGVzIHdpdGhvdXQgZmlyaW5nIGV2ZW50cy5cbiAgZnVuY3Rpb24gZW50ZXJNb2RpZmljYXRpb25SZWFsKCkge1xuICAgIHN1c3BlbmRFdmVudHMgKz0gMTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGV4aXRNb2RpZmljYXRpb25SZWFsKCkge1xuICAgIHN1c3BlbmRFdmVudHMgLT0gMTtcbiAgICBpZiAoc3VzcGVuZEV2ZW50cyA9PT0gMCAmJiBjaGFuZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIGdyYXBoUGFydC5maXJlKCdjaGFuZ2VkJywgY2hhbmdlcyk7XG4gICAgICBjaGFuZ2VzLmxlbmd0aCA9IDA7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlTm9kZUl0ZXJhdG9yKCkge1xuICAgIC8vIE9iamVjdC5rZXlzIGl0ZXJhdG9yIGlzIDEuM3ggZmFzdGVyIHRoYW4gYGZvciBpbmAgbG9vcC5cbiAgICAvLyBTZWUgYGh0dHBzOi8vZ2l0aHViLmNvbS9hbnZha2EvbmdyYXBoLmdyYXBoL3RyZWUvYmVuY2gtZm9yLWluLXZzLW9iai1rZXlzYFxuICAgIC8vIGJyYW5jaCBmb3IgcGVyZiB0ZXN0XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzID8gb2JqZWN0S2V5c0l0ZXJhdG9yIDogZm9ySW5JdGVyYXRvcjtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9iamVjdEtleXNJdGVyYXRvcihjYWxsYmFjaykge1xuICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG5vZGVzKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpIHtcbiAgICAgIGlmIChjYWxsYmFjayhub2Rlc1trZXlzW2ldXSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIGNsaWVudCBkb2Vzbid0IHdhbnQgdG8gcHJvY2VlZC4gUmV0dXJuLlxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGZvckluSXRlcmF0b3IoY2FsbGJhY2spIHtcbiAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBub2RlO1xuXG4gICAgZm9yIChub2RlIGluIG5vZGVzKSB7XG4gICAgICBpZiAoY2FsbGJhY2sobm9kZXNbbm9kZV0pKSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBjbGllbnQgZG9lc24ndCB3YW50IHRvIHByb2NlZWQuIFJldHVybi5cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLy8gbmVlZCB0aGlzIGZvciBvbGQgYnJvd3NlcnMuIFNob3VsZCB0aGlzIGJlIGEgc2VwYXJhdGUgbW9kdWxlP1xuZnVuY3Rpb24gaW5kZXhPZkVsZW1lbnRJbkFycmF5KGVsZW1lbnQsIGFycmF5KSB7XG4gIGlmICghYXJyYXkpIHJldHVybiAtMTtcblxuICBpZiAoYXJyYXkuaW5kZXhPZikge1xuICAgIHJldHVybiBhcnJheS5pbmRleE9mKGVsZW1lbnQpO1xuICB9XG5cbiAgdmFyIGxlbiA9IGFycmF5Lmxlbmd0aCxcbiAgICBpO1xuXG4gIGZvciAoaSA9IDA7IGkgPCBsZW47IGkgKz0gMSkge1xuICAgIGlmIChhcnJheVtpXSA9PT0gZWxlbWVudCkge1xuICAgICAgcmV0dXJuIGk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIC0xO1xufVxuXG4vKipcbiAqIEludGVybmFsIHN0cnVjdHVyZSB0byByZXByZXNlbnQgbm9kZTtcbiAqL1xuZnVuY3Rpb24gTm9kZShpZCwgZGF0YSkge1xuICB0aGlzLmlkID0gaWQ7XG4gIHRoaXMubGlua3MgPSBudWxsO1xuICB0aGlzLmRhdGEgPSBkYXRhO1xufVxuXG5mdW5jdGlvbiBhZGRMaW5rVG9Ob2RlKG5vZGUsIGxpbmspIHtcbiAgaWYgKG5vZGUubGlua3MpIHtcbiAgICBub2RlLmxpbmtzLnB1c2gobGluayk7XG4gIH0gZWxzZSB7XG4gICAgbm9kZS5saW5rcyA9IFtsaW5rXTtcbiAgfVxufVxuXG4vKipcbiAqIEludGVybmFsIHN0cnVjdHVyZSB0byByZXByZXNlbnQgbGlua3M7XG4gKi9cbmZ1bmN0aW9uIExpbmsoZnJvbUlkLCB0b0lkLCBkYXRhLCBpZCkge1xuICB0aGlzLmZyb21JZCA9IGZyb21JZDtcbiAgdGhpcy50b0lkID0gdG9JZDtcbiAgdGhpcy5kYXRhID0gZGF0YTtcbiAgdGhpcy5pZCA9IGlkO1xufVxuXG5mdW5jdGlvbiBoYXNoQ29kZShzdHIpIHtcbiAgdmFyIGhhc2ggPSAwLCBpLCBjaHIsIGxlbjtcbiAgaWYgKHN0ci5sZW5ndGggPT0gMCkgcmV0dXJuIGhhc2g7XG4gIGZvciAoaSA9IDAsIGxlbiA9IHN0ci5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGNociAgID0gc3RyLmNoYXJDb2RlQXQoaSk7XG4gICAgaGFzaCAgPSAoKGhhc2ggPDwgNSkgLSBoYXNoKSArIGNocjtcbiAgICBoYXNoIHw9IDA7IC8vIENvbnZlcnQgdG8gMzJiaXQgaW50ZWdlclxuICB9XG4gIHJldHVybiBoYXNoO1xufVxuXG5mdW5jdGlvbiBtYWtlTGlua0lkKGZyb21JZCwgdG9JZCkge1xuICByZXR1cm4gZnJvbUlkLnRvU3RyaW5nKCkgKyAn8J+RiSAnICsgdG9JZC50b1N0cmluZygpO1xufVxuIiwiLyoqXG4gKiBCYXNlZCBvbiBodHRwczovL2dpdGh1Yi5jb20vbW91cm5lci90aW55cXVldWVcbiAqIENvcHlyaWdodCAoYykgMjAxNywgVmxhZGltaXIgQWdhZm9ua2luIGh0dHBzOi8vZ2l0aHViLmNvbS9tb3VybmVyL3RpbnlxdWV1ZS9ibG9iL21hc3Rlci9MSUNFTlNFXG4gKiBcbiAqIEFkYXB0ZWQgZm9yIFBhdGhGaW5kaW5nIG5lZWRzIGJ5IEBhbnZha2FcbiAqIENvcHlyaWdodCAoYykgMjAxNywgQW5kcmVpIEthc2hjaGFcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBOb2RlSGVhcDtcblxuZnVuY3Rpb24gTm9kZUhlYXAoZGF0YSwgb3B0aW9ucykge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTm9kZUhlYXApKSByZXR1cm4gbmV3IE5vZGVIZWFwKGRhdGEsIG9wdGlvbnMpO1xuXG4gIGlmICghQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgIC8vIGFzc3VtZSBmaXJzdCBhcmd1bWVudCBpcyBvdXIgY29uZmlnIG9iamVjdDtcbiAgICBvcHRpb25zID0gZGF0YTtcbiAgICBkYXRhID0gW107XG4gIH1cblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB0aGlzLmRhdGEgPSBkYXRhIHx8IFtdO1xuICB0aGlzLmxlbmd0aCA9IHRoaXMuZGF0YS5sZW5ndGg7XG4gIHRoaXMuY29tcGFyZSA9IG9wdGlvbnMuY29tcGFyZSB8fCBkZWZhdWx0Q29tcGFyZTtcbiAgdGhpcy5zZXROb2RlSWQgPSBvcHRpb25zLnNldE5vZGVJZCB8fCBub29wO1xuXG4gIGlmICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICBmb3IgKHZhciBpID0gKHRoaXMubGVuZ3RoID4+IDEpOyBpID49IDA7IGktLSkgdGhpcy5fZG93bihpKTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLnNldE5vZGVJZCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5sZW5ndGg7ICsraSkge1xuICAgICAgdGhpcy5zZXROb2RlSWQodGhpcy5kYXRhW2ldLCBpKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbmZ1bmN0aW9uIGRlZmF1bHRDb21wYXJlKGEsIGIpIHtcbiAgcmV0dXJuIGEgLSBiO1xufVxuXG5Ob2RlSGVhcC5wcm90b3R5cGUgPSB7XG5cbiAgcHVzaDogZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICB0aGlzLmRhdGEucHVzaChpdGVtKTtcbiAgICB0aGlzLnNldE5vZGVJZChpdGVtLCB0aGlzLmxlbmd0aCk7XG4gICAgdGhpcy5sZW5ndGgrKztcbiAgICB0aGlzLl91cCh0aGlzLmxlbmd0aCAtIDEpO1xuICB9LFxuXG4gIHBvcDogZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIHZhciB0b3AgPSB0aGlzLmRhdGFbMF07XG4gICAgdGhpcy5sZW5ndGgtLTtcblxuICAgIGlmICh0aGlzLmxlbmd0aCA+IDApIHtcbiAgICAgIHRoaXMuZGF0YVswXSA9IHRoaXMuZGF0YVt0aGlzLmxlbmd0aF07XG4gICAgICB0aGlzLnNldE5vZGVJZCh0aGlzLmRhdGFbMF0sIDApO1xuICAgICAgdGhpcy5fZG93bigwKTtcbiAgICB9XG4gICAgdGhpcy5kYXRhLnBvcCgpO1xuXG4gICAgcmV0dXJuIHRvcDtcbiAgfSxcblxuICBwZWVrOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuZGF0YVswXTtcbiAgfSxcblxuICB1cGRhdGVJdGVtOiBmdW5jdGlvbiAocG9zKSB7XG4gICAgdGhpcy5fZG93bihwb3MpO1xuICAgIHRoaXMuX3VwKHBvcyk7XG4gIH0sXG5cbiAgX3VwOiBmdW5jdGlvbiAocG9zKSB7XG4gICAgdmFyIGRhdGEgPSB0aGlzLmRhdGE7XG4gICAgdmFyIGNvbXBhcmUgPSB0aGlzLmNvbXBhcmU7XG4gICAgdmFyIHNldE5vZGVJZCA9IHRoaXMuc2V0Tm9kZUlkO1xuICAgIHZhciBpdGVtID0gZGF0YVtwb3NdO1xuXG4gICAgd2hpbGUgKHBvcyA+IDApIHtcbiAgICAgIHZhciBwYXJlbnQgPSAocG9zIC0gMSkgPj4gMTtcbiAgICAgIHZhciBjdXJyZW50ID0gZGF0YVtwYXJlbnRdO1xuICAgICAgaWYgKGNvbXBhcmUoaXRlbSwgY3VycmVudCkgPj0gMCkgYnJlYWs7XG4gICAgICAgIGRhdGFbcG9zXSA9IGN1cnJlbnQ7XG5cbiAgICAgICBzZXROb2RlSWQoY3VycmVudCwgcG9zKTtcbiAgICAgICBwb3MgPSBwYXJlbnQ7XG4gICAgfVxuXG4gICAgZGF0YVtwb3NdID0gaXRlbTtcbiAgICBzZXROb2RlSWQoaXRlbSwgcG9zKTtcbiAgfSxcblxuICBfZG93bjogZnVuY3Rpb24gKHBvcykge1xuICAgIHZhciBkYXRhID0gdGhpcy5kYXRhO1xuICAgIHZhciBjb21wYXJlID0gdGhpcy5jb21wYXJlO1xuICAgIHZhciBoYWxmTGVuZ3RoID0gdGhpcy5sZW5ndGggPj4gMTtcbiAgICB2YXIgaXRlbSA9IGRhdGFbcG9zXTtcbiAgICB2YXIgc2V0Tm9kZUlkID0gdGhpcy5zZXROb2RlSWQ7XG5cbiAgICB3aGlsZSAocG9zIDwgaGFsZkxlbmd0aCkge1xuICAgICAgdmFyIGxlZnQgPSAocG9zIDw8IDEpICsgMTtcbiAgICAgIHZhciByaWdodCA9IGxlZnQgKyAxO1xuICAgICAgdmFyIGJlc3QgPSBkYXRhW2xlZnRdO1xuXG4gICAgICBpZiAocmlnaHQgPCB0aGlzLmxlbmd0aCAmJiBjb21wYXJlKGRhdGFbcmlnaHRdLCBiZXN0KSA8IDApIHtcbiAgICAgICAgbGVmdCA9IHJpZ2h0O1xuICAgICAgICBiZXN0ID0gZGF0YVtyaWdodF07XG4gICAgICB9XG4gICAgICBpZiAoY29tcGFyZShiZXN0LCBpdGVtKSA+PSAwKSBicmVhaztcblxuICAgICAgZGF0YVtwb3NdID0gYmVzdDtcbiAgICAgIHNldE5vZGVJZChiZXN0LCBwb3MpO1xuICAgICAgcG9zID0gbGVmdDtcbiAgICB9XG5cbiAgICBkYXRhW3Bvc10gPSBpdGVtO1xuICAgIHNldE5vZGVJZChpdGVtLCBwb3MpO1xuICB9XG59OyIsIi8qKlxuICogUGVyZm9ybXMgc3Vib3B0aW1hbCwgZ3JlZWQgQSBTdGFyIHBhdGggZmluZGluZy5cbiAqIFRoaXMgZmluZGVyIGRvZXMgbm90IG5lY2Vzc2FyeSBmaW5kcyB0aGUgc2hvcnRlc3QgcGF0aC4gVGhlIHBhdGhcbiAqIHRoYXQgaXQgZmluZHMgaXMgdmVyeSBjbG9zZSB0byB0aGUgc2hvcnRlc3Qgb25lLiBJdCBpcyB2ZXJ5IGZhc3QgdGhvdWdoLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGFTdGFyQmk7XG5cbnZhciBOb2RlSGVhcCA9IHJlcXVpcmUoJy4vTm9kZUhlYXAnKTtcbnZhciBtYWtlU2VhcmNoU3RhdGVQb29sID0gcmVxdWlyZSgnLi9tYWtlU2VhcmNoU3RhdGVQb29sJyk7XG52YXIgaGV1cmlzdGljcyA9IHJlcXVpcmUoJy4vaGV1cmlzdGljcycpO1xudmFyIGRlZmF1bHRTZXR0aW5ncyA9IHJlcXVpcmUoJy4vZGVmYXVsdFNldHRpbmdzJyk7XG5cbnZhciBCWV9GUk9NID0gMTtcbnZhciBCWV9UTyA9IDI7XG52YXIgTk9fUEFUSCA9IGRlZmF1bHRTZXR0aW5ncy5OT19QQVRIO1xuXG5tb2R1bGUuZXhwb3J0cy5sMiA9IGhldXJpc3RpY3MubDI7XG5tb2R1bGUuZXhwb3J0cy5sMSA9IGhldXJpc3RpY3MubDE7XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBpbnN0YW5jZSBvZiBwYXRoZmluZGVyLiBBIHBhdGhmaW5kZXIgaGFzIGp1c3Qgb25lIG1ldGhvZDpcbiAqIGBmaW5kKGZyb21JZCwgdG9JZClgLCBpdCBtYXkgYmUgZXh0ZW5kZWQgaW4gZnV0dXJlLlxuICogXG4gKiBOT1RFOiBBbGdvcml0aG0gaW1wbGVtZW50ZWQgaW4gdGhpcyBjb2RlIERPRVMgTk9UIGZpbmQgb3B0aW1hbCBwYXRoLlxuICogWWV0IHRoZSBwYXRoIHRoYXQgaXQgZmluZHMgaXMgYWx3YXlzIG5lYXIgb3B0aW1hbCwgYW5kIGl0IGZpbmRzIGl0IHZlcnkgZmFzdC5cbiAqIFxuICogQHBhcmFtIHtuZ3JhcGguZ3JhcGh9IGdyYXBoIGluc3RhbmNlLiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2FudmFrYS9uZ3JhcGguZ3JhcGhcbiAqIFxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMgdGhhdCBjb25maWd1cmVzIHNlYXJjaFxuICogQHBhcmFtIHtGdW5jdGlvbihhLCBiKX0gb3B0aW9ucy5oZXVyaXN0aWMgLSBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBlc3RpbWF0ZWQgZGlzdGFuY2UgYmV0d2VlblxuICogbm9kZXMgYGFgIGFuZCBgYmAuICBEZWZhdWx0cyBmdW5jdGlvbiByZXR1cm5zIDAsIHdoaWNoIG1ha2VzIHRoaXMgc2VhcmNoIGVxdWl2YWxlbnQgdG8gRGlqa3N0cmEgc2VhcmNoLlxuICogQHBhcmFtIHtGdW5jdGlvbihhLCBiKX0gb3B0aW9ucy5kaXN0YW5jZSAtIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGFjdHVhbCBkaXN0YW5jZSBiZXR3ZWVuIHR3b1xuICogbm9kZXMgYGFgIGFuZCBgYmAuIEJ5IGRlZmF1bHQgdGhpcyBpcyBzZXQgdG8gcmV0dXJuIGdyYXBoLXRoZW9yZXRpY2FsIGRpc3RhbmNlIChhbHdheXMgMSk7XG4gKiBcbiAqIEByZXR1cm5zIHtPYmplY3R9IEEgcGF0aGZpbmRlciB3aXRoIHNpbmdsZSBtZXRob2QgYGZpbmQoKWAuXG4gKi9cbmZ1bmN0aW9uIGFTdGFyQmkoZ3JhcGgsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIC8vIHdoZXRoZXIgdHJhdmVyc2FsIHNob3VsZCBiZSBjb25zaWRlcmVkIG92ZXIgb3JpZW50ZWQgZ3JhcGguXG4gIHZhciBvcmllbnRlZCA9IG9wdGlvbnMub3JpZW50ZWQ7XG5cbiAgdmFyIGhldXJpc3RpYyA9IG9wdGlvbnMuaGV1cmlzdGljO1xuICBpZiAoIWhldXJpc3RpYykgaGV1cmlzdGljID0gZGVmYXVsdFNldHRpbmdzLmhldXJpc3RpYztcblxuICB2YXIgZGlzdGFuY2UgPSBvcHRpb25zLmRpc3RhbmNlO1xuICBpZiAoIWRpc3RhbmNlKSBkaXN0YW5jZSA9IGRlZmF1bHRTZXR0aW5ncy5kaXN0YW5jZTtcbiAgdmFyIHBvb2wgPSBtYWtlU2VhcmNoU3RhdGVQb29sKCk7XG5cbiAgcmV0dXJuIHtcbiAgICBmaW5kOiBmaW5kXG4gIH07XG5cbiAgZnVuY3Rpb24gZmluZChmcm9tSWQsIHRvSWQpIHtcbiAgICAvLyBOb3Qgc3VyZSBpZiB3ZSBzaG91bGQgcmV0dXJuIE5PX1BBVEggb3IgdGhyb3cuIFRocm93IHNlZW0gdG8gYmUgbW9yZVxuICAgIC8vIGhlbHBmdWwgdG8gZGVidWcgZXJyb3JzLiBTbywgdGhyb3dpbmcuXG4gICAgdmFyIGZyb20gPSBncmFwaC5nZXROb2RlKGZyb21JZCk7XG4gICAgaWYgKCFmcm9tKSB0aHJvdyBuZXcgRXJyb3IoJ2Zyb21JZCBpcyBub3QgZGVmaW5lZCBpbiB0aGlzIGdyYXBoOiAnICsgZnJvbUlkKTtcbiAgICB2YXIgdG8gPSBncmFwaC5nZXROb2RlKHRvSWQpO1xuICAgIGlmICghdG8pIHRocm93IG5ldyBFcnJvcigndG9JZCBpcyBub3QgZGVmaW5lZCBpbiB0aGlzIGdyYXBoOiAnICsgdG9JZCk7XG5cbiAgICBpZiAoZnJvbSA9PT0gdG8pIHJldHVybiBbZnJvbV07IC8vIHRyaXZpYWwgY2FzZS5cblxuICAgIHBvb2wucmVzZXQoKTtcblxuICAgIHZhciBjYWxsVmlzaXRvciA9IG9yaWVudGVkID8gb3JpZW50ZWRWaXNpdG9yIDogbm9uT3JpZW50ZWRWaXNpdG9yO1xuXG4gICAgLy8gTWFwcyBub2RlSWQgdG8gTm9kZVNlYXJjaFN0YXRlLlxuICAgIHZhciBub2RlU3RhdGUgPSBuZXcgTWFwKCk7XG5cbiAgICB2YXIgb3BlblNldEZyb20gPSBuZXcgTm9kZUhlYXAoe1xuICAgICAgY29tcGFyZTogZGVmYXVsdFNldHRpbmdzLmNvbXBhcmVGU2NvcmUsXG4gICAgICBzZXROb2RlSWQ6IGRlZmF1bHRTZXR0aW5ncy5zZXRIZWFwSW5kZXhcbiAgICB9KTtcblxuICAgIHZhciBvcGVuU2V0VG8gPSBuZXcgTm9kZUhlYXAoe1xuICAgICAgY29tcGFyZTogZGVmYXVsdFNldHRpbmdzLmNvbXBhcmVGU2NvcmUsXG4gICAgICBzZXROb2RlSWQ6IGRlZmF1bHRTZXR0aW5ncy5zZXRIZWFwSW5kZXhcbiAgICB9KTtcblxuXG4gICAgdmFyIHN0YXJ0Tm9kZSA9IHBvb2wuY3JlYXRlTmV3U3RhdGUoZnJvbSk7XG4gICAgbm9kZVN0YXRlLnNldChmcm9tSWQsIHN0YXJ0Tm9kZSk7XG5cbiAgICAvLyBGb3IgdGhlIGZpcnN0IG5vZGUsIGZTY29yZSBpcyBjb21wbGV0ZWx5IGhldXJpc3RpYy5cbiAgICBzdGFydE5vZGUuZlNjb3JlID0gaGV1cmlzdGljKGZyb20sIHRvKTtcbiAgICAvLyBUaGUgY29zdCBvZiBnb2luZyBmcm9tIHN0YXJ0IHRvIHN0YXJ0IGlzIHplcm8uXG4gICAgc3RhcnROb2RlLmRpc3RhbmNlVG9Tb3VyY2UgPSAwO1xuICAgIG9wZW5TZXRGcm9tLnB1c2goc3RhcnROb2RlKTtcbiAgICBzdGFydE5vZGUub3BlbiA9IEJZX0ZST007XG5cbiAgICB2YXIgZW5kTm9kZSA9IHBvb2wuY3JlYXRlTmV3U3RhdGUodG8pO1xuICAgIGVuZE5vZGUuZlNjb3JlID0gaGV1cmlzdGljKHRvLCBmcm9tKTtcbiAgICBlbmROb2RlLmRpc3RhbmNlVG9Tb3VyY2UgPSAwO1xuICAgIG9wZW5TZXRUby5wdXNoKGVuZE5vZGUpO1xuICAgIGVuZE5vZGUub3BlbiA9IEJZX1RPO1xuXG4gICAgLy8gQ29zdCBvZiB0aGUgYmVzdCBzb2x1dGlvbiBmb3VuZCBzbyBmYXIuIFVzZWQgZm9yIGFjY3VyYXRlIHRlcm1pbmF0aW9uXG4gICAgdmFyIGxNaW4gPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFk7XG4gICAgdmFyIG1pbkZyb207XG4gICAgdmFyIG1pblRvO1xuXG4gICAgdmFyIGN1cnJlbnRTZXQgPSBvcGVuU2V0RnJvbTtcbiAgICB2YXIgY3VycmVudE9wZW5lciA9IEJZX0ZST007XG5cbiAgICB3aGlsZSAob3BlblNldEZyb20ubGVuZ3RoID4gMCAmJiBvcGVuU2V0VG8ubGVuZ3RoID4gMCkge1xuICAgICAgaWYgKG9wZW5TZXRGcm9tLmxlbmd0aCA8IG9wZW5TZXRUby5sZW5ndGgpIHtcbiAgICAgICAgLy8gd2UgcGljayBhIHNldCB3aXRoIGxlc3MgZWxlbWVudHNcbiAgICAgICAgY3VycmVudE9wZW5lciA9IEJZX0ZST007XG4gICAgICAgIGN1cnJlbnRTZXQgPSBvcGVuU2V0RnJvbTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGN1cnJlbnRPcGVuZXIgPSBCWV9UTztcbiAgICAgICAgY3VycmVudFNldCA9IG9wZW5TZXRUbztcbiAgICAgIH1cblxuICAgICAgdmFyIGN1cnJlbnQgPSBjdXJyZW50U2V0LnBvcCgpO1xuXG4gICAgICAvLyBubyBuZWVkIHRvIHZpc2l0IHRoaXMgbm9kZSBhbnltb3JlXG4gICAgICBjdXJyZW50LmNsb3NlZCA9IHRydWU7XG5cbiAgICAgIGlmIChjdXJyZW50LmRpc3RhbmNlVG9Tb3VyY2UgPiBsTWluKSBjb250aW51ZTtcblxuICAgICAgZ3JhcGguZm9yRWFjaExpbmtlZE5vZGUoY3VycmVudC5ub2RlLmlkLCBjYWxsVmlzaXRvcik7XG5cbiAgICAgIGlmIChtaW5Gcm9tICYmIG1pblRvKSB7XG4gICAgICAgIC8vIFRoaXMgaXMgbm90IG5lY2Vzc2FyeSB0aGUgYmVzdCBwYXRoLCBidXQgd2UgYXJlIHNvIGdyZWVkeSB0aGF0IHdlXG4gICAgICAgIC8vIGNhbid0IHJlc2lzdDpcbiAgICAgICAgcmV0dXJuIHJlY29uc3RydWN0QmlEaXJlY3Rpb25hbFBhdGgobWluRnJvbSwgbWluVG8pO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBOT19QQVRIOyAvLyBObyBwYXRoLlxuXG4gICAgZnVuY3Rpb24gbm9uT3JpZW50ZWRWaXNpdG9yKG90aGVyTm9kZSwgbGluaykge1xuICAgICAgcmV0dXJuIHZpc2l0Tm9kZShvdGhlck5vZGUsIGxpbmssIGN1cnJlbnQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9yaWVudGVkVmlzaXRvcihvdGhlck5vZGUsIGxpbmspIHtcbiAgICAgIC8vIEZvciBvcml0bmVkIGdyYXBocyB3ZSBuZWVkIHRvIHJldmVyc2UgZ3JhcGgsIHdoZW4gdHJhdmVsaW5nXG4gICAgICAvLyBiYWNrd2FyZHMuIFNvLCB3ZSB1c2Ugbm9uLW9yaWVudGVkIG5ncmFwaCdzIHRyYXZlcnNhbCwgYW5kIFxuICAgICAgLy8gZmlsdGVyIGxpbmsgb3JpZW50YXRpb24gaGVyZS5cbiAgICAgIGlmIChjdXJyZW50T3BlbmVyID09PSBCWV9GUk9NKSB7XG4gICAgICAgIGlmIChsaW5rLmZyb21JZCA9PT0gY3VycmVudC5ub2RlLmlkKSByZXR1cm4gdmlzaXROb2RlKG90aGVyTm9kZSwgbGluaywgY3VycmVudClcbiAgICAgIH0gZWxzZSBpZiAoY3VycmVudE9wZW5lciA9PT0gQllfVE8pIHtcbiAgICAgICAgaWYgKGxpbmsudG9JZCA9PT0gY3VycmVudC5ub2RlLmlkKSByZXR1cm4gdmlzaXROb2RlKG90aGVyTm9kZSwgbGluaywgY3VycmVudCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FuRXhpdChjdXJyZW50Tm9kZSkge1xuICAgICAgdmFyIG9wZW5lciA9IGN1cnJlbnROb2RlLm9wZW5cbiAgICAgIGlmIChvcGVuZXIgJiYgb3BlbmVyICE9PSBjdXJyZW50T3BlbmVyKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gcmVjb25zdHJ1Y3RCaURpcmVjdGlvbmFsUGF0aChhLCBiKSB7XG4gICAgICB2YXIgcGF0aE9mTm9kZXMgPSBbXTtcbiAgICAgIHZhciBhUGFyZW50ID0gYTtcbiAgICAgIHdoaWxlKGFQYXJlbnQpIHtcbiAgICAgICAgcGF0aE9mTm9kZXMucHVzaChhUGFyZW50Lm5vZGUpO1xuICAgICAgICBhUGFyZW50ID0gYVBhcmVudC5wYXJlbnQ7XG4gICAgICB9XG4gICAgICB2YXIgYlBhcmVudCA9IGI7XG4gICAgICB3aGlsZSAoYlBhcmVudCkge1xuICAgICAgICBwYXRoT2ZOb2Rlcy51bnNoaWZ0KGJQYXJlbnQubm9kZSk7XG4gICAgICAgIGJQYXJlbnQgPSBiUGFyZW50LnBhcmVudFxuICAgICAgfVxuICAgICAgcmV0dXJuIHBhdGhPZk5vZGVzO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZpc2l0Tm9kZShvdGhlck5vZGUsIGxpbmssIGNhbWVGcm9tKSB7XG4gICAgICB2YXIgb3RoZXJTZWFyY2hTdGF0ZSA9IG5vZGVTdGF0ZS5nZXQob3RoZXJOb2RlLmlkKTtcbiAgICAgIGlmICghb3RoZXJTZWFyY2hTdGF0ZSkge1xuICAgICAgICBvdGhlclNlYXJjaFN0YXRlID0gcG9vbC5jcmVhdGVOZXdTdGF0ZShvdGhlck5vZGUpO1xuICAgICAgICBub2RlU3RhdGUuc2V0KG90aGVyTm9kZS5pZCwgb3RoZXJTZWFyY2hTdGF0ZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChvdGhlclNlYXJjaFN0YXRlLmNsb3NlZCkge1xuICAgICAgICAvLyBBbHJlYWR5IHByb2Nlc3NlZCB0aGlzIG5vZGUuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKGNhbkV4aXQob3RoZXJTZWFyY2hTdGF0ZSwgY2FtZUZyb20pKSB7XG4gICAgICAgIC8vIHRoaXMgbm9kZSB3YXMgb3BlbmVkIGJ5IGFsdGVybmF0aXZlIG9wZW5lci4gVGhlIHNldHMgaW50ZXJzZWN0IG5vdyxcbiAgICAgICAgLy8gd2UgZm91bmQgYW4gb3B0aW1hbCBwYXRoLCB0aGF0IGdvZXMgdGhyb3VnaCAqdGhpcyogbm9kZS4gSG93ZXZlciwgdGhlcmVcbiAgICAgICAgLy8gaXMgbm8gZ3VhcmFudGVlIHRoYXQgdGhpcyBpcyB0aGUgZ2xvYmFsIG9wdGltYWwgc29sdXRpb24gcGF0aC5cblxuICAgICAgICB2YXIgcG90ZW50aWFsTE1pbiA9IG90aGVyU2VhcmNoU3RhdGUuZGlzdGFuY2VUb1NvdXJjZSArIGNhbWVGcm9tLmRpc3RhbmNlVG9Tb3VyY2U7XG4gICAgICAgIGlmIChwb3RlbnRpYWxMTWluIDwgbE1pbikge1xuICAgICAgICAgIG1pbkZyb20gPSBvdGhlclNlYXJjaFN0YXRlO1xuICAgICAgICAgIG1pblRvID0gY2FtZUZyb21cbiAgICAgICAgICBsTWluID0gcG90ZW50aWFsTE1pbjtcbiAgICAgICAgfVxuICAgICAgICAvLyB3ZSBhcmUgZG9uZSB3aXRoIHRoaXMgbm9kZS5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2YXIgdGVudGF0aXZlRGlzdGFuY2UgPSBjYW1lRnJvbS5kaXN0YW5jZVRvU291cmNlICsgZGlzdGFuY2Uob3RoZXJTZWFyY2hTdGF0ZS5ub2RlLCBjYW1lRnJvbS5ub2RlLCBsaW5rKTtcblxuICAgICAgaWYgKHRlbnRhdGl2ZURpc3RhbmNlID49IG90aGVyU2VhcmNoU3RhdGUuZGlzdGFuY2VUb1NvdXJjZSkge1xuICAgICAgICAvLyBUaGlzIHdvdWxkIG9ubHkgbWFrZSBvdXIgcGF0aCBsb25nZXIuIElnbm9yZSB0aGlzIHJvdXRlLlxuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIENob29zZSB0YXJnZXQgYmFzZWQgb24gY3VycmVudCB3b3JraW5nIHNldDpcbiAgICAgIHZhciB0YXJnZXQgPSAoY3VycmVudE9wZW5lciA9PT0gQllfRlJPTSkgPyB0byA6IGZyb207XG4gICAgICB2YXIgbmV3RlNjb3JlID0gdGVudGF0aXZlRGlzdGFuY2UgKyBoZXVyaXN0aWMob3RoZXJTZWFyY2hTdGF0ZS5ub2RlLCB0YXJnZXQpO1xuICAgICAgaWYgKG5ld0ZTY29yZSA+PSBsTWluKSB7XG4gICAgICAgIC8vIHRoaXMgY2FuJ3QgYmUgb3B0aW1hbCBwYXRoLCBhcyB3ZSBoYXZlIGFscmVhZHkgZm91bmQgYSBzaG9ydGVyIHBhdGguXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIG90aGVyU2VhcmNoU3RhdGUuZlNjb3JlID0gbmV3RlNjb3JlO1xuXG4gICAgICBpZiAob3RoZXJTZWFyY2hTdGF0ZS5vcGVuID09PSAwKSB7XG4gICAgICAgIC8vIFJlbWVtYmVyIHRoaXMgbm9kZSBpbiB0aGUgY3VycmVudCBzZXRcbiAgICAgICAgY3VycmVudFNldC5wdXNoKG90aGVyU2VhcmNoU3RhdGUpO1xuICAgICAgICBjdXJyZW50U2V0LnVwZGF0ZUl0ZW0ob3RoZXJTZWFyY2hTdGF0ZS5oZWFwSW5kZXgpO1xuXG4gICAgICAgIG90aGVyU2VhcmNoU3RhdGUub3BlbiA9IGN1cnJlbnRPcGVuZXI7XG4gICAgICB9XG5cbiAgICAgIC8vIGJpbmdvISB3ZSBmb3VuZCBzaG9ydGVyIHBhdGg6XG4gICAgICBvdGhlclNlYXJjaFN0YXRlLnBhcmVudCA9IGNhbWVGcm9tO1xuICAgICAgb3RoZXJTZWFyY2hTdGF0ZS5kaXN0YW5jZVRvU291cmNlID0gdGVudGF0aXZlRGlzdGFuY2U7XG4gICAgfVxuICB9XG59XG4iLCIvKipcbiAqIFBlcmZvcm1zIGEgdW5pLWRpcmVjdGlvbmFsIEEgU3RhciBzZWFyY2ggb24gZ3JhcGguXG4gKiBcbiAqIFdlIHdpbGwgdHJ5IHRvIG1pbmltaXplIGYobikgPSBnKG4pICsgaChuKSwgd2hlcmVcbiAqIGcobikgaXMgYWN0dWFsIGRpc3RhbmNlIGZyb20gc291cmNlIG5vZGUgdG8gYG5gLCBhbmRcbiAqIGgobikgaXMgaGV1cmlzdGljIGRpc3RhbmNlIGZyb20gYG5gIHRvIHRhcmdldCBub2RlLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGFTdGFyUGF0aFNlYXJjaDtcblxudmFyIE5vZGVIZWFwID0gcmVxdWlyZSgnLi9Ob2RlSGVhcCcpO1xudmFyIG1ha2VTZWFyY2hTdGF0ZVBvb2wgPSByZXF1aXJlKCcuL21ha2VTZWFyY2hTdGF0ZVBvb2wnKTtcbnZhciBoZXVyaXN0aWNzID0gcmVxdWlyZSgnLi9oZXVyaXN0aWNzJyk7XG52YXIgZGVmYXVsdFNldHRpbmdzID0gcmVxdWlyZSgnLi9kZWZhdWx0U2V0dGluZ3MuanMnKTtcblxudmFyIE5PX1BBVEggPSBkZWZhdWx0U2V0dGluZ3MuTk9fUEFUSDtcblxubW9kdWxlLmV4cG9ydHMubDIgPSBoZXVyaXN0aWNzLmwyO1xubW9kdWxlLmV4cG9ydHMubDEgPSBoZXVyaXN0aWNzLmwxO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgcGF0aGZpbmRlci4gQSBwYXRoZmluZGVyIGhhcyBqdXN0IG9uZSBtZXRob2Q6XG4gKiBgZmluZChmcm9tSWQsIHRvSWQpYCwgaXQgbWF5IGJlIGV4dGVuZGVkIGluIGZ1dHVyZS5cbiAqIFxuICogQHBhcmFtIHtuZ3JhcGguZ3JhcGh9IGdyYXBoIGluc3RhbmNlLiBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2FudmFrYS9uZ3JhcGguZ3JhcGhcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zIHRoYXQgY29uZmlndXJlcyBzZWFyY2hcbiAqIEBwYXJhbSB7RnVuY3Rpb24oYSwgYil9IG9wdGlvbnMuaGV1cmlzdGljIC0gYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgZXN0aW1hdGVkIGRpc3RhbmNlIGJldHdlZW5cbiAqIG5vZGVzIGBhYCBhbmQgYGJgLiBUaGlzIGZ1bmN0aW9uIHNob3VsZCBuZXZlciBvdmVyZXN0aW1hdGUgYWN0dWFsIGRpc3RhbmNlIGJldHdlZW4gdHdvXG4gKiBub2RlcyAob3RoZXJ3aXNlIHRoZSBmb3VuZCBwYXRoIHdpbGwgbm90IGJlIHRoZSBzaG9ydGVzdCkuIERlZmF1bHRzIGZ1bmN0aW9uIHJldHVybnMgMCxcbiAqIHdoaWNoIG1ha2VzIHRoaXMgc2VhcmNoIGVxdWl2YWxlbnQgdG8gRGlqa3N0cmEgc2VhcmNoLlxuICogQHBhcmFtIHtGdW5jdGlvbihhLCBiKX0gb3B0aW9ucy5kaXN0YW5jZSAtIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGFjdHVhbCBkaXN0YW5jZSBiZXR3ZWVuIHR3b1xuICogbm9kZXMgYGFgIGFuZCBgYmAuIEJ5IGRlZmF1bHQgdGhpcyBpcyBzZXQgdG8gcmV0dXJuIGdyYXBoLXRoZW9yZXRpY2FsIGRpc3RhbmNlIChhbHdheXMgMSk7XG4gKiBcbiAqIEByZXR1cm5zIHtPYmplY3R9IEEgcGF0aGZpbmRlciB3aXRoIHNpbmdsZSBtZXRob2QgYGZpbmQoKWAuXG4gKi9cbmZ1bmN0aW9uIGFTdGFyUGF0aFNlYXJjaChncmFwaCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgLy8gd2hldGhlciB0cmF2ZXJzYWwgc2hvdWxkIGJlIGNvbnNpZGVyZWQgb3ZlciBvcmllbnRlZCBncmFwaC5cbiAgdmFyIG9yaWVudGVkID0gb3B0aW9ucy5vcmllbnRlZDtcblxuICB2YXIgaGV1cmlzdGljID0gb3B0aW9ucy5oZXVyaXN0aWM7XG4gIGlmICghaGV1cmlzdGljKSBoZXVyaXN0aWMgPSBkZWZhdWx0U2V0dGluZ3MuaGV1cmlzdGljO1xuXG4gIHZhciBkaXN0YW5jZSA9IG9wdGlvbnMuZGlzdGFuY2U7XG4gIGlmICghZGlzdGFuY2UpIGRpc3RhbmNlID0gZGVmYXVsdFNldHRpbmdzLmRpc3RhbmNlO1xuICB2YXIgcG9vbCA9IG1ha2VTZWFyY2hTdGF0ZVBvb2woKTtcblxuICByZXR1cm4ge1xuICAgIC8qKlxuICAgICAqIEZpbmRzIGEgcGF0aCBiZXR3ZWVuIG5vZGUgYGZyb21JZGAgYW5kIGB0b0lkYC5cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IG9mIG5vZGVzIGJldHdlZW4gYHRvSWRgIGFuZCBgZnJvbUlkYC4gRW1wdHkgYXJyYXkgaXMgcmV0dXJuZWRcbiAgICAgKiBpZiBubyBwYXRoIGlzIGZvdW5kLlxuICAgICAqL1xuICAgIGZpbmQ6IGZpbmRcbiAgfTtcblxuICBmdW5jdGlvbiBmaW5kKGZyb21JZCwgdG9JZCkge1xuICAgIHZhciBmcm9tID0gZ3JhcGguZ2V0Tm9kZShmcm9tSWQpO1xuICAgIGlmICghZnJvbSkgdGhyb3cgbmV3IEVycm9yKCdmcm9tSWQgaXMgbm90IGRlZmluZWQgaW4gdGhpcyBncmFwaDogJyArIGZyb21JZCk7XG4gICAgdmFyIHRvID0gZ3JhcGguZ2V0Tm9kZSh0b0lkKTtcbiAgICBpZiAoIXRvKSB0aHJvdyBuZXcgRXJyb3IoJ3RvSWQgaXMgbm90IGRlZmluZWQgaW4gdGhpcyBncmFwaDogJyArIHRvSWQpO1xuICAgIHBvb2wucmVzZXQoKTtcblxuICAgIC8vIE1hcHMgbm9kZUlkIHRvIE5vZGVTZWFyY2hTdGF0ZS5cbiAgICB2YXIgbm9kZVN0YXRlID0gbmV3IE1hcCgpO1xuXG4gICAgLy8gdGhlIG5vZGVzIHRoYXQgd2Ugc3RpbGwgbmVlZCB0byBldmFsdWF0ZVxuICAgIHZhciBvcGVuU2V0ID0gbmV3IE5vZGVIZWFwKHtcbiAgICAgIGNvbXBhcmU6IGRlZmF1bHRTZXR0aW5ncy5jb21wYXJlRlNjb3JlLFxuICAgICAgc2V0Tm9kZUlkOiBkZWZhdWx0U2V0dGluZ3Muc2V0SGVhcEluZGV4XG4gICAgfSk7XG5cbiAgICB2YXIgc3RhcnROb2RlID0gcG9vbC5jcmVhdGVOZXdTdGF0ZShmcm9tKTtcbiAgICBub2RlU3RhdGUuc2V0KGZyb21JZCwgc3RhcnROb2RlKTtcblxuICAgIC8vIEZvciB0aGUgZmlyc3Qgbm9kZSwgZlNjb3JlIGlzIGNvbXBsZXRlbHkgaGV1cmlzdGljLlxuICAgIHN0YXJ0Tm9kZS5mU2NvcmUgPSBoZXVyaXN0aWMoZnJvbSwgdG8pO1xuXG4gICAgLy8gVGhlIGNvc3Qgb2YgZ29pbmcgZnJvbSBzdGFydCB0byBzdGFydCBpcyB6ZXJvLlxuICAgIHN0YXJ0Tm9kZS5kaXN0YW5jZVRvU291cmNlID0gMDtcbiAgICBvcGVuU2V0LnB1c2goc3RhcnROb2RlKTtcbiAgICBzdGFydE5vZGUub3BlbiA9IDE7XG5cbiAgICB2YXIgY2FtZUZyb207XG5cbiAgICB3aGlsZSAob3BlblNldC5sZW5ndGggPiAwKSB7XG4gICAgICBjYW1lRnJvbSA9IG9wZW5TZXQucG9wKCk7XG4gICAgICBpZiAoZ29hbFJlYWNoZWQoY2FtZUZyb20sIHRvKSkgcmV0dXJuIHJlY29uc3RydWN0UGF0aChjYW1lRnJvbSk7XG5cbiAgICAgIC8vIG5vIG5lZWQgdG8gdmlzaXQgdGhpcyBub2RlIGFueW1vcmVcbiAgICAgIGNhbWVGcm9tLmNsb3NlZCA9IHRydWU7XG4gICAgICBncmFwaC5mb3JFYWNoTGlua2VkTm9kZShjYW1lRnJvbS5ub2RlLmlkLCB2aXNpdE5laWdoYm91ciwgb3JpZW50ZWQpO1xuICAgIH1cblxuICAgIC8vIElmIHdlIGdvdCBoZXJlLCB0aGVuIHRoZXJlIGlzIG5vIHBhdGguXG4gICAgcmV0dXJuIE5PX1BBVEg7XG5cbiAgICBmdW5jdGlvbiB2aXNpdE5laWdoYm91cihvdGhlck5vZGUsIGxpbmspIHtcbiAgICAgIHZhciBvdGhlclNlYXJjaFN0YXRlID0gbm9kZVN0YXRlLmdldChvdGhlck5vZGUuaWQpO1xuICAgICAgaWYgKCFvdGhlclNlYXJjaFN0YXRlKSB7XG4gICAgICAgIG90aGVyU2VhcmNoU3RhdGUgPSBwb29sLmNyZWF0ZU5ld1N0YXRlKG90aGVyTm9kZSk7XG4gICAgICAgIG5vZGVTdGF0ZS5zZXQob3RoZXJOb2RlLmlkLCBvdGhlclNlYXJjaFN0YXRlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG90aGVyU2VhcmNoU3RhdGUuY2xvc2VkKSB7XG4gICAgICAgIC8vIEFscmVhZHkgcHJvY2Vzc2VkIHRoaXMgbm9kZS5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKG90aGVyU2VhcmNoU3RhdGUub3BlbiA9PT0gMCkge1xuICAgICAgICAvLyBSZW1lbWJlciB0aGlzIG5vZGUuXG4gICAgICAgIG9wZW5TZXQucHVzaChvdGhlclNlYXJjaFN0YXRlKTtcbiAgICAgICAgb3RoZXJTZWFyY2hTdGF0ZS5vcGVuID0gMTtcbiAgICAgIH1cblxuICAgICAgdmFyIHRlbnRhdGl2ZURpc3RhbmNlID0gY2FtZUZyb20uZGlzdGFuY2VUb1NvdXJjZSArIGRpc3RhbmNlKG90aGVyTm9kZSwgY2FtZUZyb20ubm9kZSwgbGluayk7XG4gICAgICBpZiAodGVudGF0aXZlRGlzdGFuY2UgPj0gb3RoZXJTZWFyY2hTdGF0ZS5kaXN0YW5jZVRvU291cmNlKSB7XG4gICAgICAgIC8vIFRoaXMgd291bGQgb25seSBtYWtlIG91ciBwYXRoIGxvbmdlci4gSWdub3JlIHRoaXMgcm91dGUuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gYmluZ28hIHdlIGZvdW5kIHNob3J0ZXIgcGF0aDpcbiAgICAgIG90aGVyU2VhcmNoU3RhdGUucGFyZW50ID0gY2FtZUZyb207XG4gICAgICBvdGhlclNlYXJjaFN0YXRlLmRpc3RhbmNlVG9Tb3VyY2UgPSB0ZW50YXRpdmVEaXN0YW5jZTtcbiAgICAgIG90aGVyU2VhcmNoU3RhdGUuZlNjb3JlID0gdGVudGF0aXZlRGlzdGFuY2UgKyBoZXVyaXN0aWMob3RoZXJTZWFyY2hTdGF0ZS5ub2RlLCB0byk7XG5cbiAgICAgIG9wZW5TZXQudXBkYXRlSXRlbShvdGhlclNlYXJjaFN0YXRlLmhlYXBJbmRleCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGdvYWxSZWFjaGVkKHNlYXJjaFN0YXRlLCB0YXJnZXROb2RlKSB7XG4gIHJldHVybiBzZWFyY2hTdGF0ZS5ub2RlID09PSB0YXJnZXROb2RlO1xufVxuXG5mdW5jdGlvbiByZWNvbnN0cnVjdFBhdGgoc2VhcmNoU3RhdGUpIHtcbiAgdmFyIHBhdGggPSBbc2VhcmNoU3RhdGUubm9kZV07XG4gIHZhciBwYXJlbnQgPSBzZWFyY2hTdGF0ZS5wYXJlbnQ7XG5cbiAgd2hpbGUgKHBhcmVudCkge1xuICAgIHBhdGgucHVzaChwYXJlbnQubm9kZSk7XG4gICAgcGFyZW50ID0gcGFyZW50LnBhcmVudDtcbiAgfVxuXG4gIHJldHVybiBwYXRoO1xufVxuIiwiLy8gV2UgcmV1c2UgaW5zdGFuY2Ugb2YgYXJyYXksIGJ1dCB3ZSB0cmllIHRvIGZyZWV6ZSBpdCBhcyB3ZWxsLFxuLy8gc28gdGhhdCBjb25zdW1lcnMgZG9uJ3QgbW9kaWZ5IGl0LiBNYXliZSBpdCdzIGEgYmFkIGlkZWEuXG52YXIgTk9fUEFUSCA9IFtdO1xuaWYgKHR5cGVvZiBPYmplY3QuZnJlZXplID09PSAnZnVuY3Rpb24nKSBPYmplY3QuZnJlZXplKE5PX1BBVEgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgLy8gUGF0aCBzZWFyY2ggc2V0dGluZ3NcbiAgaGV1cmlzdGljOiBibGluZEhldXJpc3RpYyxcbiAgZGlzdGFuY2U6IGNvbnN0YW50RGlzdGFuY2UsXG4gIGNvbXBhcmVGU2NvcmU6IGNvbXBhcmVGU2NvcmUsXG4gIE5PX1BBVEg6IE5PX1BBVEgsXG5cbiAgLy8gaGVhcCBzZXR0aW5nc1xuICBzZXRIZWFwSW5kZXg6IHNldEhlYXBJbmRleCxcblxuICAvLyBuYmE6XG4gIHNldEgxOiBzZXRIMSxcbiAgc2V0SDI6IHNldEgyLFxuICBjb21wYXJlRjFTY29yZTogY29tcGFyZUYxU2NvcmUsXG4gIGNvbXBhcmVGMlNjb3JlOiBjb21wYXJlRjJTY29yZSxcbn1cblxuZnVuY3Rpb24gYmxpbmRIZXVyaXN0aWMoLyogYSwgYiAqLykge1xuICAvLyBibGluZCBoZXVyaXN0aWMgbWFrZXMgdGhpcyBzZWFyY2ggZXF1YWwgdG8gcGxhaW4gRGlqa3N0cmEgcGF0aCBzZWFyY2guXG4gIHJldHVybiAwO1xufVxuXG5mdW5jdGlvbiBjb25zdGFudERpc3RhbmNlKC8qIGEsIGIgKi8pIHtcbiAgcmV0dXJuIDE7XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVGU2NvcmUoYSwgYikge1xuICB2YXIgcmVzdWx0ID0gYS5mU2NvcmUgLSBiLmZTY29yZTtcbiAgLy8gVE9ETzogQ2FuIEkgaW1wcm92ZSBzcGVlZCB3aXRoIHNtYXJ0ZXIgdGllcy1icmVha2luZz9cbiAgLy8gSSB0cmllZCBkaXN0YW5jZVRvU291cmNlLCBidXQgaXQgZGlkbid0IHNlZW0gdG8gaGF2ZSBtdWNoIGVmZmVjdFxuICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBzZXRIZWFwSW5kZXgobm9kZVNlYXJjaFN0YXRlLCBoZWFwSW5kZXgpIHtcbiAgbm9kZVNlYXJjaFN0YXRlLmhlYXBJbmRleCA9IGhlYXBJbmRleDtcbn1cblxuZnVuY3Rpb24gY29tcGFyZUYxU2NvcmUoYSwgYikge1xuICByZXR1cm4gYS5mMSAtIGIuZjE7XG59XG5cbmZ1bmN0aW9uIGNvbXBhcmVGMlNjb3JlKGEsIGIpIHtcbiAgcmV0dXJuIGEuZjIgLSBiLmYyO1xufVxuXG5mdW5jdGlvbiBzZXRIMShub2RlLCBoZWFwSW5kZXgpIHtcbiAgbm9kZS5oMSA9IGhlYXBJbmRleDtcbn1cblxuZnVuY3Rpb24gc2V0SDIobm9kZSwgaGVhcEluZGV4KSB7XG4gIG5vZGUuaDIgPSBoZWFwSW5kZXg7XG59IiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIGwyOiBsMixcbiAgbDE6IGwxXG59O1xuXG4vKipcbiAqIEV1Y2xpZCBkaXN0YW5jZSAobDIgbm9ybSk7XG4gKiBcbiAqIEBwYXJhbSB7Kn0gYSBcbiAqIEBwYXJhbSB7Kn0gYiBcbiAqL1xuZnVuY3Rpb24gbDIoYSwgYikge1xuICB2YXIgZHggPSBhLnggLSBiLng7XG4gIHZhciBkeSA9IGEueSAtIGIueTtcbiAgcmV0dXJuIE1hdGguc3FydChkeCAqIGR4ICsgZHkgKiBkeSk7XG59XG5cbi8qKlxuICogTWFuaGF0dGFuIGRpc3RhbmNlIChsMSBub3JtKTtcbiAqIEBwYXJhbSB7Kn0gYSBcbiAqIEBwYXJhbSB7Kn0gYiBcbiAqL1xuZnVuY3Rpb24gbDEoYSwgYikge1xuICB2YXIgZHggPSBhLnggLSBiLng7XG4gIHZhciBkeSA9IGEueSAtIGIueTtcbiAgcmV0dXJuIE1hdGguYWJzKGR4KSArIE1hdGguYWJzKGR5KTtcbn1cbiIsIi8qKlxuICogVGhpcyBjbGFzcyByZXByZXNlbnRzIGEgc2luZ2xlIHNlYXJjaCBub2RlIGluIHRoZSBleHBsb3JhdGlvbiB0cmVlIGZvclxuICogQSogYWxnb3JpdGhtLlxuICogXG4gKiBAcGFyYW0ge09iamVjdH0gbm9kZSAgb3JpZ2luYWwgbm9kZSBpbiB0aGUgZ3JhcGhcbiAqL1xuZnVuY3Rpb24gTm9kZVNlYXJjaFN0YXRlKG5vZGUpIHtcbiAgdGhpcy5ub2RlID0gbm9kZTtcblxuICAvLyBIb3cgd2UgY2FtZSB0byB0aGlzIG5vZGU/XG4gIHRoaXMucGFyZW50ID0gbnVsbDtcblxuICB0aGlzLmNsb3NlZCA9IGZhbHNlO1xuICB0aGlzLm9wZW4gPSAwO1xuXG4gIHRoaXMuZGlzdGFuY2VUb1NvdXJjZSA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcbiAgLy8gdGhlIGYobikgPSBnKG4pICsgaChuKSB2YWx1ZVxuICB0aGlzLmZTY29yZSA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcblxuICAvLyB1c2VkIHRvIHJlY29uc3RydWN0IGhlYXAgd2hlbiBmU2NvcmUgaXMgdXBkYXRlZC5cbiAgdGhpcy5oZWFwSW5kZXggPSAtMTtcbn07XG5cbmZ1bmN0aW9uIG1ha2VTZWFyY2hTdGF0ZVBvb2woKSB7XG4gIHZhciBjdXJyZW50SW5DYWNoZSA9IDA7XG4gIHZhciBub2RlQ2FjaGUgPSBbXTtcblxuICByZXR1cm4ge1xuICAgIGNyZWF0ZU5ld1N0YXRlOiBjcmVhdGVOZXdTdGF0ZSxcbiAgICByZXNldDogcmVzZXRcbiAgfTtcblxuICBmdW5jdGlvbiByZXNldCgpIHtcbiAgICBjdXJyZW50SW5DYWNoZSA9IDA7XG4gIH1cblxuICBmdW5jdGlvbiBjcmVhdGVOZXdTdGF0ZShub2RlKSB7XG4gICAgdmFyIGNhY2hlZCA9IG5vZGVDYWNoZVtjdXJyZW50SW5DYWNoZV07XG4gICAgaWYgKGNhY2hlZCkge1xuICAgICAgLy8gVE9ETzogVGhpcyBhbG1vc3QgZHVwbGljYXRlcyBjb25zdHJ1Y3RvciBjb2RlLiBOb3Qgc3VyZSBpZlxuICAgICAgLy8gaXQgd291bGQgaW1wYWN0IHBlcmZvcm1hbmNlIGlmIEkgbW92ZSB0aGlzIGNvZGUgaW50byBhIGZ1bmN0aW9uXG4gICAgICBjYWNoZWQubm9kZSA9IG5vZGU7XG4gICAgICAvLyBIb3cgd2UgY2FtZSB0byB0aGlzIG5vZGU/XG4gICAgICBjYWNoZWQucGFyZW50ID0gbnVsbDtcblxuICAgICAgY2FjaGVkLmNsb3NlZCA9IGZhbHNlO1xuICAgICAgY2FjaGVkLm9wZW4gPSAwO1xuXG4gICAgICBjYWNoZWQuZGlzdGFuY2VUb1NvdXJjZSA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcbiAgICAgIC8vIHRoZSBmKG4pID0gZyhuKSArIGgobikgdmFsdWVcbiAgICAgIGNhY2hlZC5mU2NvcmUgPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFk7XG5cbiAgICAgIC8vIHVzZWQgdG8gcmVjb25zdHJ1Y3QgaGVhcCB3aGVuIGZTY29yZSBpcyB1cGRhdGVkLlxuICAgICAgY2FjaGVkLmhlYXBJbmRleCA9IC0xO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIGNhY2hlZCA9IG5ldyBOb2RlU2VhcmNoU3RhdGUobm9kZSk7XG4gICAgICBub2RlQ2FjaGVbY3VycmVudEluQ2FjaGVdID0gY2FjaGVkO1xuICAgIH1cbiAgICBjdXJyZW50SW5DYWNoZSsrO1xuICAgIHJldHVybiBjYWNoZWQ7XG4gIH1cbn1cbm1vZHVsZS5leHBvcnRzID0gbWFrZVNlYXJjaFN0YXRlUG9vbDsiLCJtb2R1bGUuZXhwb3J0cyA9IG5iYTtcblxudmFyIE5vZGVIZWFwID0gcmVxdWlyZSgnLi4vTm9kZUhlYXAnKTtcbnZhciBoZXVyaXN0aWNzID0gcmVxdWlyZSgnLi4vaGV1cmlzdGljcycpO1xudmFyIGRlZmF1bHRTZXR0aW5ncyA9IHJlcXVpcmUoJy4uL2RlZmF1bHRTZXR0aW5ncy5qcycpO1xudmFyIG1ha2VOQkFTZWFyY2hTdGF0ZVBvb2wgPSByZXF1aXJlKCcuL21ha2VOQkFTZWFyY2hTdGF0ZVBvb2wuanMnKTtcblxudmFyIE5PX1BBVEggPSBkZWZhdWx0U2V0dGluZ3MuTk9fUEFUSDtcblxubW9kdWxlLmV4cG9ydHMubDIgPSBoZXVyaXN0aWNzLmwyO1xubW9kdWxlLmV4cG9ydHMubDEgPSBoZXVyaXN0aWNzLmwxO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgcGF0aGZpbmRlci4gQSBwYXRoZmluZGVyIGhhcyBqdXN0IG9uZSBtZXRob2Q6XG4gKiBgZmluZChmcm9tSWQsIHRvSWQpYC5cbiAqIFxuICogVGhpcyBpcyBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgTkJBKiBhbGdvcml0aG0gZGVzY3JpYmVkIGluIFxuICogXG4gKiAgXCJZZXQgYW5vdGhlciBiaWRpcmVjdGlvbmFsIGFsZ29yaXRobSBmb3Igc2hvcnRlc3QgcGF0aHNcIiBwYXBlciBieSBXaW0gUGlqbHMgYW5kIEhlbmsgUG9zdFxuICogXG4gKiBUaGUgcGFwZXIgaXMgYXZhaWxhYmxlIGhlcmU6IGh0dHBzOi8vcmVwdWIuZXVyLm5sL3B1Yi8xNjEwMC9laTIwMDktMTAucGRmXG4gKiBcbiAqIEBwYXJhbSB7bmdyYXBoLmdyYXBofSBncmFwaCBpbnN0YW5jZS4gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9hbnZha2EvbmdyYXBoLmdyYXBoXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyB0aGF0IGNvbmZpZ3VyZXMgc2VhcmNoXG4gKiBAcGFyYW0ge0Z1bmN0aW9uKGEsIGIpfSBvcHRpb25zLmhldXJpc3RpYyAtIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGVzdGltYXRlZCBkaXN0YW5jZSBiZXR3ZWVuXG4gKiBub2RlcyBgYWAgYW5kIGBiYC4gVGhpcyBmdW5jdGlvbiBzaG91bGQgbmV2ZXIgb3ZlcmVzdGltYXRlIGFjdHVhbCBkaXN0YW5jZSBiZXR3ZWVuIHR3b1xuICogbm9kZXMgKG90aGVyd2lzZSB0aGUgZm91bmQgcGF0aCB3aWxsIG5vdCBiZSB0aGUgc2hvcnRlc3QpLiBEZWZhdWx0cyBmdW5jdGlvbiByZXR1cm5zIDAsXG4gKiB3aGljaCBtYWtlcyB0aGlzIHNlYXJjaCBlcXVpdmFsZW50IHRvIERpamtzdHJhIHNlYXJjaC5cbiAqIEBwYXJhbSB7RnVuY3Rpb24oYSwgYil9IG9wdGlvbnMuZGlzdGFuY2UgLSBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhY3R1YWwgZGlzdGFuY2UgYmV0d2VlbiB0d29cbiAqIG5vZGVzIGBhYCBhbmQgYGJgLiBCeSBkZWZhdWx0IHRoaXMgaXMgc2V0IHRvIHJldHVybiBncmFwaC10aGVvcmV0aWNhbCBkaXN0YW5jZSAoYWx3YXlzIDEpO1xuICogXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBBIHBhdGhmaW5kZXIgd2l0aCBzaW5nbGUgbWV0aG9kIGBmaW5kKClgLlxuICovXG5mdW5jdGlvbiBuYmEoZ3JhcGgsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIC8vIHdoZXRoZXIgdHJhdmVyc2FsIHNob3VsZCBiZSBjb25zaWRlcmVkIG92ZXIgb3JpZW50ZWQgZ3JhcGguXG4gIHZhciBvcmllbnRlZCA9IG9wdGlvbnMub3JpZW50ZWQ7XG4gIHZhciBxdWl0RmFzdCA9IG9wdGlvbnMucXVpdEZhc3Q7XG5cbiAgdmFyIGhldXJpc3RpYyA9IG9wdGlvbnMuaGV1cmlzdGljO1xuICBpZiAoIWhldXJpc3RpYykgaGV1cmlzdGljID0gZGVmYXVsdFNldHRpbmdzLmhldXJpc3RpYztcblxuICB2YXIgZGlzdGFuY2UgPSBvcHRpb25zLmRpc3RhbmNlO1xuICBpZiAoIWRpc3RhbmNlKSBkaXN0YW5jZSA9IGRlZmF1bHRTZXR0aW5ncy5kaXN0YW5jZTtcblxuICAvLyBEdXJpbmcgc3RyZXNzIHRlc3RzIEkgbm90aWNlZCB0aGF0IGdhcmJhZ2UgY29sbGVjdGlvbiB3YXMgb25lIG9mIHRoZSBoZWF2aWVzdFxuICAvLyBjb250cmlidXRvcnMgdG8gdGhlIGFsZ29yaXRobSdzIHNwZWVkLiBTbyBJJ20gdXNpbmcgYW4gb2JqZWN0IHBvb2wgdG8gcmVjeWNsZSBub2Rlcy5cbiAgdmFyIHBvb2wgPSBtYWtlTkJBU2VhcmNoU3RhdGVQb29sKCk7XG5cbiAgcmV0dXJuIHtcbiAgICAvKipcbiAgICAgKiBGaW5kcyBhIHBhdGggYmV0d2VlbiBub2RlIGBmcm9tSWRgIGFuZCBgdG9JZGAuXG4gICAgICogQHJldHVybnMge0FycmF5fSBvZiBub2RlcyBiZXR3ZWVuIGB0b0lkYCBhbmQgYGZyb21JZGAuIEVtcHR5IGFycmF5IGlzIHJldHVybmVkXG4gICAgICogaWYgbm8gcGF0aCBpcyBmb3VuZC5cbiAgICAgKi9cbiAgICBmaW5kOiBmaW5kXG4gIH07XG5cbiAgZnVuY3Rpb24gZmluZChmcm9tSWQsIHRvSWQpIHtcbiAgICAvLyBJIG11c3QgYXBvbG9naXplIGZvciB0aGUgY29kZSBkdXBsaWNhdGlvbi4gVGhpcyB3YXMgdGhlIGVhc2llc3Qgd2F5IGZvciBtZSB0b1xuICAgIC8vIGltcGxlbWVudCB0aGUgYWxnb3JpdGhtIGZhc3QuXG4gICAgdmFyIGZyb20gPSBncmFwaC5nZXROb2RlKGZyb21JZCk7XG4gICAgaWYgKCFmcm9tKSB0aHJvdyBuZXcgRXJyb3IoJ2Zyb21JZCBpcyBub3QgZGVmaW5lZCBpbiB0aGlzIGdyYXBoOiAnICsgZnJvbUlkKTtcbiAgICB2YXIgdG8gPSBncmFwaC5nZXROb2RlKHRvSWQpO1xuICAgIGlmICghdG8pIHRocm93IG5ldyBFcnJvcigndG9JZCBpcyBub3QgZGVmaW5lZCBpbiB0aGlzIGdyYXBoOiAnICsgdG9JZCk7XG5cbiAgICBwb29sLnJlc2V0KCk7XG5cbiAgICAvLyBJIG11c3QgYWxzbyBhcG9sb2dpemUgZm9yIHNvbWV3aGF0IGNyeXB0aWMgbmFtZXMuIFRoZSBOQkEqIGlzIGJpLWRpcmVjdGlvbmFsXG4gICAgLy8gc2VhcmNoIGFsZ29yaXRobSwgd2hpY2ggbWVhbnMgaXQgcnVucyB0d28gc2VhcmNoZXMgaW4gcGFyYWxsZWwuIE9uZSBydW5zXG4gICAgLy8gZnJvbSBzb3VyY2Ugbm9kZSB0byB0YXJnZXQsIHdoaWxlIHRoZSBvdGhlciBvbmUgcnVucyBmcm9tIHRhcmdldCB0byBzb3VyY2UuXG4gICAgLy8gRXZlcnl3aGVyZSB3aGVyZSB5b3Ugc2VlIGAxYCBpdCBtZWFucyBpdCdzIGZvciB0aGUgZm9yd2FyZCBzZWFyY2guIGAyYCBpcyBmb3IgXG4gICAgLy8gYmFja3dhcmQgc2VhcmNoLlxuXG4gICAgLy8gRm9yIG9yaWVudGVkIGdyYXBoIHBhdGggZmluZGluZywgd2UgbmVlZCB0byByZXZlcnNlIHRoZSBncmFwaCwgc28gdGhhdFxuICAgIC8vIGJhY2t3YXJkIHNlYXJjaCB2aXNpdHMgY29ycmVjdCBsaW5rLiBPYnZpb3VzbHkgd2UgZG9uJ3Qgd2FudCB0byBkdXBsaWNhdGVcbiAgICAvLyB0aGUgZ3JhcGgsIGluc3RlYWQgd2UgYWx3YXlzIHRyYXZlcnNlIHRoZSBncmFwaCBhcyBub24tb3JpZW50ZWQsIGFuZCBmaWx0ZXJcbiAgICAvLyBlZGdlcyBpbiBgdmlzaXROMU9yaWVudGVkL3Zpc2l0TjJPcml0ZW50ZWRgXG4gICAgdmFyIGZvcndhcmRWaXNpdG9yID0gb3JpZW50ZWQgPyB2aXNpdE4xT3JpZW50ZWQgOiB2aXNpdE4xO1xuICAgIHZhciByZXZlcnNlVmlzaXRvciA9IG9yaWVudGVkID8gdmlzaXROMk9yaWVudGVkIDogdmlzaXROMjtcblxuICAgIC8vIE1hcHMgbm9kZUlkIHRvIE5CQVNlYXJjaFN0YXRlLlxuICAgIHZhciBub2RlU3RhdGUgPSBuZXcgTWFwKCk7XG5cbiAgICAvLyBUaGVzZSB0d28gaGVhcHMgc3RvcmUgbm9kZXMgYnkgdGhlaXIgdW5kZXJlc3RpbWF0ZWQgdmFsdWVzLlxuICAgIHZhciBvcGVuMVNldCA9IG5ldyBOb2RlSGVhcCh7XG4gICAgICBjb21wYXJlOiBkZWZhdWx0U2V0dGluZ3MuY29tcGFyZUYxU2NvcmUsXG4gICAgICBzZXROb2RlSWQ6IGRlZmF1bHRTZXR0aW5ncy5zZXRIMVxuICAgIH0pO1xuICAgIHZhciBvcGVuMlNldCA9IG5ldyBOb2RlSGVhcCh7XG4gICAgICBjb21wYXJlOiBkZWZhdWx0U2V0dGluZ3MuY29tcGFyZUYyU2NvcmUsXG4gICAgICBzZXROb2RlSWQ6IGRlZmF1bHRTZXR0aW5ncy5zZXRIMlxuICAgIH0pO1xuXG4gICAgLy8gVGhpcyBpcyB3aGVyZSBib3RoIHNlYXJjaGVzIHdpbGwgbWVldC5cbiAgICB2YXIgbWluTm9kZTtcblxuICAgIC8vIFRoZSBzbWFsbGVzdCBwYXRoIGxlbmd0aCBzZWVuIHNvIGZhciBpcyBzdG9yZWQgaGVyZTpcbiAgICB2YXIgbE1pbiA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcblxuICAgIC8vIFdlIHN0YXJ0IGJ5IHB1dHRpbmcgc3RhcnQvZW5kIG5vZGVzIHRvIHRoZSBjb3JyZXNwb25kaW5nIGhlYXBzXG4gICAgdmFyIHN0YXJ0Tm9kZSA9IHBvb2wuY3JlYXRlTmV3U3RhdGUoZnJvbSk7XG4gICAgbm9kZVN0YXRlLnNldChmcm9tSWQsIHN0YXJ0Tm9kZSk7IFxuICAgIHN0YXJ0Tm9kZS5nMSA9IDA7XG4gICAgdmFyIGYxID0gaGV1cmlzdGljKGZyb20sIHRvKTtcbiAgICBzdGFydE5vZGUuZjEgPSBmMTtcbiAgICBvcGVuMVNldC5wdXNoKHN0YXJ0Tm9kZSk7XG5cbiAgICB2YXIgZW5kTm9kZSA9IHBvb2wuY3JlYXRlTmV3U3RhdGUodG8pO1xuICAgIG5vZGVTdGF0ZS5zZXQodG9JZCwgZW5kTm9kZSk7XG4gICAgZW5kTm9kZS5nMiA9IDA7XG4gICAgdmFyIGYyID0gZjE7IC8vIHRoZXkgc2hvdWxkIGFncmVlIG9yaWdpbmFsbHlcbiAgICBlbmROb2RlLmYyID0gZjI7XG4gICAgb3BlbjJTZXQucHVzaChlbmROb2RlKVxuXG4gICAgLy8gdGhlIGBjYW1lRnJvbWAgdmFyaWFibGUgaXMgYWNjZXNzZWQgYnkgYm90aCBzZWFyY2hlcywgc28gdGhhdCB3ZSBjYW4gc3RvcmUgcGFyZW50cy5cbiAgICB2YXIgY2FtZUZyb207XG5cbiAgICAvLyB0aGlzIGlzIHRoZSBtYWluIGFsZ29yaXRobSBsb29wOlxuICAgIHdoaWxlIChvcGVuMlNldC5sZW5ndGggJiYgb3BlbjFTZXQubGVuZ3RoKSB7XG4gICAgICBpZiAob3BlbjFTZXQubGVuZ3RoIDwgb3BlbjJTZXQubGVuZ3RoKSB7XG4gICAgICAgIGZvcndhcmRTZWFyY2goKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldmVyc2VTZWFyY2goKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHF1aXRGYXN0ICYmIG1pbk5vZGUpIGJyZWFrO1xuICAgIH1cblxuICAgIC8vIElmIHdlIGdvdCBoZXJlLCB0aGVuIHRoZXJlIGlzIG5vIHBhdGguXG4gICAgdmFyIHBhdGggPSByZWNvbnN0cnVjdFBhdGgobWluTm9kZSk7XG4gICAgcmV0dXJuIHBhdGg7IC8vIHRoZSBwdWJsaWMgQVBJIGlzIG92ZXJcblxuICAgIGZ1bmN0aW9uIGZvcndhcmRTZWFyY2goKSB7XG4gICAgICBjYW1lRnJvbSA9IG9wZW4xU2V0LnBvcCgpO1xuICAgICAgaWYgKGNhbWVGcm9tLmNsb3NlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNhbWVGcm9tLmNsb3NlZCA9IHRydWU7XG5cbiAgICAgIGlmIChjYW1lRnJvbS5mMSA8IGxNaW4gJiYgKGNhbWVGcm9tLmcxICsgZjIgLSBoZXVyaXN0aWMoZnJvbSwgY2FtZUZyb20ubm9kZSkpIDwgbE1pbikge1xuICAgICAgICBncmFwaC5mb3JFYWNoTGlua2VkTm9kZShjYW1lRnJvbS5ub2RlLmlkLCBmb3J3YXJkVmlzaXRvcik7XG4gICAgICB9XG5cbiAgICAgIGlmIChvcGVuMVNldC5sZW5ndGggPiAwKSB7XG4gICAgICAgIGYxID0gb3BlbjFTZXQucGVlaygpLmYxO1xuICAgICAgfSBcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXZlcnNlU2VhcmNoKCkge1xuICAgICAgY2FtZUZyb20gPSBvcGVuMlNldC5wb3AoKTtcbiAgICAgIGlmIChjYW1lRnJvbS5jbG9zZWQpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2FtZUZyb20uY2xvc2VkID0gdHJ1ZTtcblxuICAgICAgaWYgKGNhbWVGcm9tLmYyIDwgbE1pbiAmJiAoY2FtZUZyb20uZzIgKyBmMSAtIGhldXJpc3RpYyhjYW1lRnJvbS5ub2RlLCB0bykpIDwgbE1pbikge1xuICAgICAgICBncmFwaC5mb3JFYWNoTGlua2VkTm9kZShjYW1lRnJvbS5ub2RlLmlkLCByZXZlcnNlVmlzaXRvcik7XG4gICAgICB9XG5cbiAgICAgIGlmIChvcGVuMlNldC5sZW5ndGggPiAwKSB7XG4gICAgICAgIGYyID0gb3BlbjJTZXQucGVlaygpLmYyO1xuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHZpc2l0TjEob3RoZXJOb2RlLCBsaW5rKSB7XG4gICAgICB2YXIgb3RoZXJTZWFyY2hTdGF0ZSA9IG5vZGVTdGF0ZS5nZXQob3RoZXJOb2RlLmlkKTtcbiAgICAgIGlmICghb3RoZXJTZWFyY2hTdGF0ZSkge1xuICAgICAgICBvdGhlclNlYXJjaFN0YXRlID0gcG9vbC5jcmVhdGVOZXdTdGF0ZShvdGhlck5vZGUpO1xuICAgICAgICBub2RlU3RhdGUuc2V0KG90aGVyTm9kZS5pZCwgb3RoZXJTZWFyY2hTdGF0ZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChvdGhlclNlYXJjaFN0YXRlLmNsb3NlZCkgcmV0dXJuO1xuXG4gICAgICB2YXIgdGVudGF0aXZlRGlzdGFuY2UgPSBjYW1lRnJvbS5nMSArIGRpc3RhbmNlKGNhbWVGcm9tLm5vZGUsIG90aGVyTm9kZSwgbGluayk7XG5cbiAgICAgIGlmICh0ZW50YXRpdmVEaXN0YW5jZSA8IG90aGVyU2VhcmNoU3RhdGUuZzEpIHtcbiAgICAgICAgb3RoZXJTZWFyY2hTdGF0ZS5nMSA9IHRlbnRhdGl2ZURpc3RhbmNlO1xuICAgICAgICBvdGhlclNlYXJjaFN0YXRlLmYxID0gdGVudGF0aXZlRGlzdGFuY2UgKyBoZXVyaXN0aWMob3RoZXJTZWFyY2hTdGF0ZS5ub2RlLCB0byk7XG4gICAgICAgIG90aGVyU2VhcmNoU3RhdGUucDEgPSBjYW1lRnJvbTtcbiAgICAgICAgaWYgKG90aGVyU2VhcmNoU3RhdGUuaDEgPCAwKSB7XG4gICAgICAgICAgb3BlbjFTZXQucHVzaChvdGhlclNlYXJjaFN0YXRlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvcGVuMVNldC51cGRhdGVJdGVtKG90aGVyU2VhcmNoU3RhdGUuaDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB2YXIgcG90ZW50aWFsTWluID0gb3RoZXJTZWFyY2hTdGF0ZS5nMSArIG90aGVyU2VhcmNoU3RhdGUuZzI7XG4gICAgICBpZiAocG90ZW50aWFsTWluIDwgbE1pbikgeyBcbiAgICAgICAgbE1pbiA9IHBvdGVudGlhbE1pbjtcbiAgICAgICAgbWluTm9kZSA9IG90aGVyU2VhcmNoU3RhdGU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdmlzaXROMihvdGhlck5vZGUsIGxpbmspIHtcbiAgICAgIHZhciBvdGhlclNlYXJjaFN0YXRlID0gbm9kZVN0YXRlLmdldChvdGhlck5vZGUuaWQpO1xuICAgICAgaWYgKCFvdGhlclNlYXJjaFN0YXRlKSB7XG4gICAgICAgIG90aGVyU2VhcmNoU3RhdGUgPSBwb29sLmNyZWF0ZU5ld1N0YXRlKG90aGVyTm9kZSk7XG4gICAgICAgIG5vZGVTdGF0ZS5zZXQob3RoZXJOb2RlLmlkLCBvdGhlclNlYXJjaFN0YXRlKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG90aGVyU2VhcmNoU3RhdGUuY2xvc2VkKSByZXR1cm47XG5cbiAgICAgIHZhciB0ZW50YXRpdmVEaXN0YW5jZSA9IGNhbWVGcm9tLmcyICsgZGlzdGFuY2UoY2FtZUZyb20ubm9kZSwgb3RoZXJOb2RlLCBsaW5rKTtcblxuICAgICAgaWYgKHRlbnRhdGl2ZURpc3RhbmNlIDwgb3RoZXJTZWFyY2hTdGF0ZS5nMikge1xuICAgICAgICBvdGhlclNlYXJjaFN0YXRlLmcyID0gdGVudGF0aXZlRGlzdGFuY2U7XG4gICAgICAgIG90aGVyU2VhcmNoU3RhdGUuZjIgPSB0ZW50YXRpdmVEaXN0YW5jZSArIGhldXJpc3RpYyhmcm9tLCBvdGhlclNlYXJjaFN0YXRlLm5vZGUpO1xuICAgICAgICBvdGhlclNlYXJjaFN0YXRlLnAyID0gY2FtZUZyb207XG4gICAgICAgIGlmIChvdGhlclNlYXJjaFN0YXRlLmgyIDwgMCkge1xuICAgICAgICAgIG9wZW4yU2V0LnB1c2gob3RoZXJTZWFyY2hTdGF0ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb3BlbjJTZXQudXBkYXRlSXRlbShvdGhlclNlYXJjaFN0YXRlLmgyKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdmFyIHBvdGVudGlhbE1pbiA9IG90aGVyU2VhcmNoU3RhdGUuZzEgKyBvdGhlclNlYXJjaFN0YXRlLmcyO1xuICAgICAgaWYgKHBvdGVudGlhbE1pbiA8IGxNaW4pIHtcbiAgICAgICAgbE1pbiA9IHBvdGVudGlhbE1pbjtcbiAgICAgICAgbWluTm9kZSA9IG90aGVyU2VhcmNoU3RhdGU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdmlzaXROMk9yaWVudGVkKG90aGVyTm9kZSwgbGluaykge1xuICAgICAgLy8gd2UgYXJlIGdvaW5nIGJhY2t3YXJkcywgZ3JhcGggbmVlZHMgdG8gYmUgcmV2ZXJzZWQuIFxuICAgICAgaWYgKGxpbmsudG9JZCA9PT0gY2FtZUZyb20ubm9kZS5pZCkgcmV0dXJuIHZpc2l0TjIob3RoZXJOb2RlLCBsaW5rKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gdmlzaXROMU9yaWVudGVkKG90aGVyTm9kZSwgbGluaykge1xuICAgICAgLy8gdGhpcyBpcyBmb3J3YXJkIGRpcmVjdGlvbiwgc28gd2Ugc2hvdWxkIGJlIGNvbWluZyBGUk9NOlxuICAgICAgaWYgKGxpbmsuZnJvbUlkID09PSBjYW1lRnJvbS5ub2RlLmlkKSByZXR1cm4gdmlzaXROMShvdGhlck5vZGUsIGxpbmspO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiByZWNvbnN0cnVjdFBhdGgoc2VhcmNoU3RhdGUpIHtcbiAgaWYgKCFzZWFyY2hTdGF0ZSkgcmV0dXJuIE5PX1BBVEg7XG5cbiAgdmFyIHBhdGggPSBbc2VhcmNoU3RhdGUubm9kZV07XG4gIHZhciBwYXJlbnQgPSBzZWFyY2hTdGF0ZS5wMTtcblxuICB3aGlsZSAocGFyZW50KSB7XG4gICAgcGF0aC5wdXNoKHBhcmVudC5ub2RlKTtcbiAgICBwYXJlbnQgPSBwYXJlbnQucDE7XG4gIH1cblxuICB2YXIgY2hpbGQgPSBzZWFyY2hTdGF0ZS5wMjtcblxuICB3aGlsZSAoY2hpbGQpIHtcbiAgICBwYXRoLnVuc2hpZnQoY2hpbGQubm9kZSk7XG4gICAgY2hpbGQgPSBjaGlsZC5wMjtcbiAgfVxuICByZXR1cm4gcGF0aDtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gbWFrZU5CQVNlYXJjaFN0YXRlUG9vbDtcblxuLyoqXG4gKiBDcmVhdGVzIG5ldyBpbnN0YW5jZSBvZiBOQkFTZWFyY2hTdGF0ZS4gVGhlIGluc3RhbmNlIHN0b3JlcyBpbmZvcm1hdGlvblxuICogYWJvdXQgc2VhcmNoIHN0YXRlLCBhbmQgaXMgdXNlZCBieSBOQkEqIGFsZ29yaXRobS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gbm9kZSAtIG9yaWdpbmFsIGdyYXBoIG5vZGVcbiAqL1xuZnVuY3Rpb24gTkJBU2VhcmNoU3RhdGUobm9kZSkge1xuICAvKipcbiAgICogT3JpZ2luYWwgZ3JhcGggbm9kZS5cbiAgICovXG4gIHRoaXMubm9kZSA9IG5vZGU7XG5cbiAgLyoqXG4gICAqIFBhcmVudCBvZiB0aGlzIG5vZGUgaW4gZm9yd2FyZCBzZWFyY2hcbiAgICovXG4gIHRoaXMucDEgPSBudWxsO1xuXG4gIC8qKlxuICAgKiBQYXJlbnQgb2YgdGhpcyBub2RlIGluIHJldmVyc2Ugc2VhcmNoXG4gICAqL1xuICB0aGlzLnAyID0gbnVsbDtcblxuICAvKipcbiAgICogSWYgdGhpcyBpcyBzZXQgdG8gdHJ1ZSwgdGhlbiB0aGUgbm9kZSB3YXMgYWxyZWFkeSBwcm9jZXNzZWRcbiAgICogYW5kIHdlIHNob3VsZCBub3QgdG91Y2ggaXQgYW55bW9yZS5cbiAgICovXG4gIHRoaXMuY2xvc2VkID0gZmFsc2U7XG5cbiAgLyoqXG4gICAqIEFjdHVhbCBkaXN0YW5jZSBmcm9tIHRoaXMgbm9kZSB0byBpdHMgcGFyZW50IGluIGZvcndhcmQgc2VhcmNoXG4gICAqL1xuICB0aGlzLmcxID0gTnVtYmVyLlBPU0lUSVZFX0lORklOSVRZO1xuXG4gIC8qKlxuICAgKiBBY3R1YWwgZGlzdGFuY2UgZnJvbSB0aGlzIG5vZGUgdG8gaXRzIHBhcmVudCBpbiByZXZlcnNlIHNlYXJjaFxuICAgKi9cbiAgdGhpcy5nMiA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcblxuXG4gIC8qKlxuICAgKiBVbmRlcmVzdGltYXRlZCBkaXN0YW5jZSBmcm9tIHRoaXMgbm9kZSB0byB0aGUgcGF0aC1maW5kaW5nIHNvdXJjZS5cbiAgICovXG4gIHRoaXMuZjEgPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFk7XG5cbiAgLyoqXG4gICAqIFVuZGVyZXN0aW1hdGVkIGRpc3RhbmNlIGZyb20gdGhpcyBub2RlIHRvIHRoZSBwYXRoLWZpbmRpbmcgdGFyZ2V0LlxuICAgKi9cbiAgdGhpcy5mMiA9IE51bWJlci5QT1NJVElWRV9JTkZJTklUWTtcblxuICAvLyB1c2VkIHRvIHJlY29uc3RydWN0IGhlYXAgd2hlbiBmU2NvcmUgaXMgdXBkYXRlZC4gVE9ETzogZG8gSSBuZWVkIHRoZW0gYm90aD9cblxuICAvKipcbiAgICogSW5kZXggb2YgdGhpcyBub2RlIGluIHRoZSBmb3J3YXJkIGhlYXAuXG4gICAqL1xuICB0aGlzLmgxID0gLTE7XG5cbiAgLyoqXG4gICAqIEluZGV4IG9mIHRoaXMgbm9kZSBpbiB0aGUgcmV2ZXJzZSBoZWFwLlxuICAgKi9cbiAgdGhpcy5oMiA9IC0xO1xufVxuXG4vKipcbiAqIEFzIHBhdGgtZmluZGluZyBpcyBtZW1vcnktaW50ZW5zaXZlIHByb2Nlc3MsIHdlIHdhbnQgdG8gcmVkdWNlIHByZXNzdXJlIG9uXG4gKiBnYXJiYWdlIGNvbGxlY3Rvci4gVGhpcyBjbGFzcyBoZWxwcyB1cyB0byByZWN5Y2xlIHBhdGgtZmluZGluZyBub2RlcyBhbmQgc2lnbmlmaWNhbnRseVxuICogcmVkdWNlcyB0aGUgc2VhcmNoIHRpbWUgKH4yMCUgZmFzdGVyIHRoYW4gd2l0aG91dCBpdCkuXG4gKi9cbmZ1bmN0aW9uIG1ha2VOQkFTZWFyY2hTdGF0ZVBvb2woKSB7XG4gIHZhciBjdXJyZW50SW5DYWNoZSA9IDA7XG4gIHZhciBub2RlQ2FjaGUgPSBbXTtcblxuICByZXR1cm4ge1xuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgYSBuZXcgTkJBU2VhcmNoU3RhdGUgaW5zdGFuY2VcbiAgICAgKi9cbiAgICBjcmVhdGVOZXdTdGF0ZTogY3JlYXRlTmV3U3RhdGUsXG5cbiAgICAvKipcbiAgICAgKiBNYXJrcyBhbGwgY3JlYXRlZCBpbnN0YW5jZXMgYXZhaWxhYmxlIGZvciByZWN5Y2xpbmcuXG4gICAgICovXG4gICAgcmVzZXQ6IHJlc2V0XG4gIH07XG5cbiAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgY3VycmVudEluQ2FjaGUgPSAwO1xuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlTmV3U3RhdGUobm9kZSkge1xuICAgIHZhciBjYWNoZWQgPSBub2RlQ2FjaGVbY3VycmVudEluQ2FjaGVdO1xuICAgIGlmIChjYWNoZWQpIHtcbiAgICAgIC8vIFRPRE86IFRoaXMgYWxtb3N0IGR1cGxpY2F0ZXMgY29uc3RydWN0b3IgY29kZS4gTm90IHN1cmUgaWZcbiAgICAgIC8vIGl0IHdvdWxkIGltcGFjdCBwZXJmb3JtYW5jZSBpZiBJIG1vdmUgdGhpcyBjb2RlIGludG8gYSBmdW5jdGlvblxuICAgICAgY2FjaGVkLm5vZGUgPSBub2RlO1xuXG4gICAgICAvLyBIb3cgd2UgY2FtZSB0byB0aGlzIG5vZGU/XG4gICAgICBjYWNoZWQucDEgPSBudWxsO1xuICAgICAgY2FjaGVkLnAyID0gbnVsbDtcblxuICAgICAgY2FjaGVkLmNsb3NlZCA9IGZhbHNlO1xuXG4gICAgICBjYWNoZWQuZzEgPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFk7XG4gICAgICBjYWNoZWQuZzIgPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFk7XG4gICAgICBjYWNoZWQuZjEgPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFk7XG4gICAgICBjYWNoZWQuZjIgPSBOdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFk7XG5cbiAgICAgIC8vIHVzZWQgdG8gcmVjb25zdHJ1Y3QgaGVhcCB3aGVuIGZTY29yZSBpcyB1cGRhdGVkLlxuICAgICAgY2FjaGVkLmgxID0gLTE7XG4gICAgICBjYWNoZWQuaDIgPSAtMTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FjaGVkID0gbmV3IE5CQVNlYXJjaFN0YXRlKG5vZGUpO1xuICAgICAgbm9kZUNhY2hlW2N1cnJlbnRJbkNhY2hlXSA9IGNhY2hlZDtcbiAgICB9XG4gICAgY3VycmVudEluQ2FjaGUrKztcbiAgICByZXR1cm4gY2FjaGVkO1xuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgYVN0YXI6IHJlcXVpcmUoJy4vYS1zdGFyL2Etc3Rhci5qcycpLFxuICBhR3JlZWR5OiByZXF1aXJlKCcuL2Etc3Rhci9hLWdyZWVkeS1zdGFyJyksXG4gIG5iYTogcmVxdWlyZSgnLi9hLXN0YXIvbmJhL2luZGV4LmpzJyksXG59XG4iLCJpbXBvcnQgQXBwbGljYXRpb24gZnJvbSAnLi9saWIvQXBwbGljYXRpb24nXG5pbXBvcnQgTG9hZGluZ1NjZW5lIGZyb20gJy4vc2NlbmVzL0xvYWRpbmdTY2VuZSdcblxuLy8gQ3JlYXRlIGEgUGl4aSBBcHBsaWNhdGlvblxubGV0IGFwcCA9IG5ldyBBcHBsaWNhdGlvbih7XG4gIHdpZHRoOiAyNTYsXG4gIGhlaWdodDogMjU2LFxuICByb3VuZFBpeGVsczogdHJ1ZSxcbiAgYXV0b1Jlc2l6ZTogdHJ1ZSxcbiAgcmVzb2x1dGlvbjogMSxcbiAgYXV0b1N0YXJ0OiBmYWxzZVxufSlcblxuYXBwLnJlbmRlcmVyLnZpZXcuc3R5bGUucG9zaXRpb24gPSAnYWJzb2x1dGUnXG5hcHAucmVuZGVyZXIudmlldy5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJ1xuYXBwLnJlbmRlcmVyLnJlc2l6ZSh3aW5kb3cuaW5uZXJXaWR0aCwgd2luZG93LmlubmVySGVpZ2h0KVxuXG4vLyBBZGQgdGhlIGNhbnZhcyB0aGF0IFBpeGkgYXV0b21hdGljYWxseSBjcmVhdGVkIGZvciB5b3UgdG8gdGhlIEhUTUwgZG9jdW1lbnRcbmRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYXBwLnZpZXcpXG5cbmFwcC5jaGFuZ2VTdGFnZSgpXG5hcHAuc3RhcnQoKVxuYXBwLmNoYW5nZVNjZW5lKExvYWRpbmdTY2VuZSlcbiIsImV4cG9ydCBjb25zdCBJU19NT0JJTEUgPSAoKGEpID0+IC8oYW5kcm9pZHxiYlxcZCt8bWVlZ28pLittb2JpbGV8YXZhbnRnb3xiYWRhXFwvfGJsYWNrYmVycnl8YmxhemVyfGNvbXBhbHxlbGFpbmV8ZmVubmVjfGhpcHRvcHxpZW1vYmlsZXxpcChob25lfG9kKXxpcmlzfGtpbmRsZXxsZ2UgfG1hZW1vfG1pZHB8bW1wfG1vYmlsZS4rZmlyZWZveHxuZXRmcm9udHxvcGVyYSBtKG9ifGluKWl8cGFsbSggb3MpP3xwaG9uZXxwKGl4aXxyZSlcXC98cGx1Y2tlcnxwb2NrZXR8cHNwfHNlcmllcyg0fDYpMHxzeW1iaWFufHRyZW98dXBcXC4oYnJvd3NlcnxsaW5rKXx2b2RhZm9uZXx3YXB8d2luZG93cyBjZXx4ZGF8eGlpbm8vaS50ZXN0KGEpIHx8XG4gIC8xMjA3fDYzMTB8NjU5MHwzZ3NvfDR0aHB8NTBbMS02XWl8Nzcwc3w4MDJzfGEgd2F8YWJhY3xhYyhlcnxvb3xzLSl8YWkoa298cm4pfGFsKGF2fGNhfGNvKXxhbW9pfGFuKGV4fG55fHl3KXxhcHR1fGFyKGNofGdvKXxhcyh0ZXx1cyl8YXR0d3xhdShkaXwtbXxyIHxzICl8YXZhbnxiZShja3xsbHxucSl8YmkobGJ8cmQpfGJsKGFjfGF6KXxicihlfHYpd3xidW1ifGJ3LShufHUpfGM1NVxcL3xjYXBpfGNjd2F8Y2RtLXxjZWxsfGNodG18Y2xkY3xjbWQtfGNvKG1wfG5kKXxjcmF3fGRhKGl0fGxsfG5nKXxkYnRlfGRjLXN8ZGV2aXxkaWNhfGRtb2J8ZG8oY3xwKW98ZHMoMTJ8LWQpfGVsKDQ5fGFpKXxlbShsMnx1bCl8ZXIoaWN8azApfGVzbDh8ZXooWzQtN10wfG9zfHdhfHplKXxmZXRjfGZseSgtfF8pfGcxIHV8ZzU2MHxnZW5lfGdmLTV8Zy1tb3xnbyhcXC53fG9kKXxncihhZHx1bil8aGFpZXxoY2l0fGhkLShtfHB8dCl8aGVpLXxoaShwdHx0YSl8aHAoIGl8aXApfGhzLWN8aHQoYygtfCB8X3xhfGd8cHxzfHQpfHRwKXxodShhd3x0Yyl8aS0oMjB8Z298bWEpfGkyMzB8aWFjKCB8LXxcXC8pfGlicm98aWRlYXxpZzAxfGlrb218aW0xa3xpbm5vfGlwYXF8aXJpc3xqYSh0fHYpYXxqYnJvfGplbXV8amlnc3xrZGRpfGtlaml8a2d0KCB8XFwvKXxrbG9ufGtwdCB8a3djLXxreW8oY3xrKXxsZShub3x4aSl8bGcoIGd8XFwvKGt8bHx1KXw1MHw1NHwtW2Etd10pfGxpYnd8bHlueHxtMS13fG0zZ2F8bTUwXFwvfG1hKHRlfHVpfHhvKXxtYygwMXwyMXxjYSl8bS1jcnxtZShyY3xyaSl8bWkobzh8b2F8dHMpfG1tZWZ8bW8oMDF8MDJ8Yml8ZGV8ZG98dCgtfCB8b3x2KXx6eil8bXQoNTB8cDF8diApfG13YnB8bXl3YXxuMTBbMC0yXXxuMjBbMi0zXXxuMzAoMHwyKXxuNTAoMHwyfDUpfG43KDAoMHwxKXwxMCl8bmUoKGN8bSktfG9ufHRmfHdmfHdnfHd0KXxub2soNnxpKXxuenBofG8yaW18b3AodGl8d3YpfG9yYW58b3dnMXxwODAwfHBhbihhfGR8dCl8cGR4Z3xwZygxM3wtKFsxLThdfGMpKXxwaGlsfHBpcmV8cGwoYXl8dWMpfHBuLTJ8cG8oY2t8cnR8c2UpfHByb3h8cHNpb3xwdC1nfHFhLWF8cWMoMDd8MTJ8MjF8MzJ8NjB8LVsyLTddfGktKXxxdGVrfHIzODB8cjYwMHxyYWtzfHJpbTl8cm8odmV8em8pfHM1NVxcL3xzYShnZXxtYXxtbXxtc3xueXx2YSl8c2MoMDF8aC18b298cC0pfHNka1xcL3xzZShjKC18MHwxKXw0N3xtY3xuZHxyaSl8c2doLXxzaGFyfHNpZSgtfG0pfHNrLTB8c2woNDV8aWQpfHNtKGFsfGFyfGIzfGl0fHQ1KXxzbyhmdHxueSl8c3AoMDF8aC18di18diApfHN5KDAxfG1iKXx0MigxOHw1MCl8dDYoMDB8MTB8MTgpfHRhKGd0fGxrKXx0Y2wtfHRkZy18dGVsKGl8bSl8dGltLXx0LW1vfHRvKHBsfHNoKXx0cyg3MHxtLXxtM3xtNSl8dHgtOXx1cChcXC5ifGcxfHNpKXx1dHN0fHY0MDB8djc1MHx2ZXJpfHZpKHJnfHRlKXx2ayg0MHw1WzAtM118LXYpfHZtNDB8dm9kYXx2dWxjfHZ4KDUyfDUzfDYwfDYxfDcwfDgwfDgxfDgzfDg1fDk4KXx3M2MoLXwgKXx3ZWJjfHdoaXR8d2koZyB8bmN8bncpfHdtbGJ8d29udXx4NzAwfHlhcy18eW91cnx6ZXRvfHp0ZS0vaS50ZXN0KGEuc3Vic3RyKDAsIDQpKVxuKShuYXZpZ2F0b3IudXNlckFnZW50IHx8IG5hdmlnYXRvci52ZW5kb3IgfHwgd2luZG93Lm9wZXJhKVxuXG5leHBvcnQgY29uc3QgQ0VJTF9TSVpFID0gMzJcblxuZXhwb3J0IGNvbnN0IEFCSUxJVFlfTU9WRSA9IFN5bWJvbCgnbW92ZScpXG5leHBvcnQgY29uc3QgQUJJTElUWV9DQU1FUkEgPSBTeW1ib2woJ2NhbWVyYScpXG5leHBvcnQgY29uc3QgQUJJTElUWV9PUEVSQVRFID0gU3ltYm9sKCdvcGVyYXRlJylcbmV4cG9ydCBjb25zdCBBQklMSVRZX0tFWV9NT1ZFID0gU3ltYm9sKCdrZXktbW92ZScpXG5leHBvcnQgY29uc3QgQUJJTElUWV9MSUZFID0gU3ltYm9sKCdsaWZlJylcbmV4cG9ydCBjb25zdCBBQklMSVRZX0NBUlJZID0gU3ltYm9sKCdjYXJyeScpXG5leHBvcnQgY29uc3QgQUJJTElUWV9MRUFSTiA9IFN5bWJvbCgnbGVhcm4nKVxuZXhwb3J0IGNvbnN0IEFCSUxJVFlfUExBQ0UgPSBTeW1ib2woJ3BsYWNlJylcbmV4cG9ydCBjb25zdCBBQklMSVRZX0tFWV9QTEFDRSA9IFN5bWJvbCgna2V5LXBsYWNlJylcbmV4cG9ydCBjb25zdCBBQklMSVRZX0tFWV9GSVJFID0gU3ltYm9sKCdmaXJlJylcbmV4cG9ydCBjb25zdCBBQklMSVRJRVNfQUxMID0gW1xuICBBQklMSVRZX01PVkUsXG4gIEFCSUxJVFlfQ0FNRVJBLFxuICBBQklMSVRZX09QRVJBVEUsXG4gIEFCSUxJVFlfS0VZX01PVkUsXG4gIEFCSUxJVFlfTElGRSxcbiAgQUJJTElUWV9DQVJSWSxcbiAgQUJJTElUWV9MRUFSTixcbiAgQUJJTElUWV9QTEFDRSxcbiAgQUJJTElUWV9LRVlfUExBQ0UsXG4gIEFCSUxJVFlfS0VZX0ZJUkVcbl1cblxuLy8gb2JqZWN0IHR5cGUsIHN0YXRpYyBvYmplY3QsIG5vdCBjb2xsaWRlIHdpdGhcbmV4cG9ydCBjb25zdCBTVEFUSUMgPSAnc3RhdGljJ1xuLy8gY29sbGlkZSB3aXRoXG5leHBvcnQgY29uc3QgU1RBWSA9ICdzdGF5J1xuLy8gdG91Y2ggd2lsbCByZXBseVxuZXhwb3J0IGNvbnN0IFJFUExZID0gJ3JlcGx5J1xuIiwiZXhwb3J0IGNvbnN0IExFRlQgPSAnYSdcbmV4cG9ydCBjb25zdCBVUCA9ICd3J1xuZXhwb3J0IGNvbnN0IFJJR0hUID0gJ2QnXG5leHBvcnQgY29uc3QgRE9XTiA9ICdzJ1xuZXhwb3J0IGNvbnN0IFBMQUNFMSA9ICcxJ1xuZXhwb3J0IGNvbnN0IFBMQUNFMiA9ICcyJ1xuZXhwb3J0IGNvbnN0IFBMQUNFMyA9ICczJ1xuZXhwb3J0IGNvbnN0IFBMQUNFNCA9ICc0J1xuZXhwb3J0IGNvbnN0IEZJUkUgPSAnZidcbiIsImltcG9ydCB7IEFwcGxpY2F0aW9uIGFzIFBpeGlBcHBsaWNhdGlvbiwgR3JhcGhpY3MsIGRpc3BsYXkgfSBmcm9tICcuL1BJWEknXG5cbmNsYXNzIEFwcGxpY2F0aW9uIGV4dGVuZHMgUGl4aUFwcGxpY2F0aW9uIHtcbiAgY2hhbmdlU3RhZ2UgKCkge1xuICAgIHRoaXMuc3RhZ2UgPSBuZXcgZGlzcGxheS5TdGFnZSgpXG4gIH1cblxuICBjaGFuZ2VTY2VuZSAoU2NlbmVOYW1lLCBwYXJhbXMpIHtcbiAgICBpZiAodGhpcy5jdXJyZW50U2NlbmUpIHtcbiAgICAgIC8vIG1heWJlIHVzZSBwcm9taXNlIGZvciBhbmltYXRpb25cbiAgICAgIC8vIHJlbW92ZSBnYW1lbG9vcD9cbiAgICAgIHRoaXMuY3VycmVudFNjZW5lLmRlc3Ryb3koKVxuICAgICAgdGhpcy5zdGFnZS5yZW1vdmVDaGlsZCh0aGlzLmN1cnJlbnRTY2VuZSlcbiAgICB9XG5cbiAgICBsZXQgc2NlbmUgPSBuZXcgU2NlbmVOYW1lKHBhcmFtcylcbiAgICB0aGlzLnN0YWdlLmFkZENoaWxkKHNjZW5lKVxuICAgIHNjZW5lLmNyZWF0ZSgpXG4gICAgc2NlbmUub24oJ2NoYW5nZVNjZW5lJywgdGhpcy5jaGFuZ2VTY2VuZS5iaW5kKHRoaXMpKVxuXG4gICAgdGhpcy5jdXJyZW50U2NlbmUgPSBzY2VuZVxuICB9XG5cbiAgc3RhcnQgKC4uLmFyZ3MpIHtcbiAgICBzdXBlci5zdGFydCguLi5hcmdzKVxuXG4gICAgLy8gY3JlYXRlIGEgYmFja2dyb3VuZCBtYWtlIHN0YWdlIGhhcyB3aWR0aCAmIGhlaWdodFxuICAgIGxldCB2aWV3ID0gdGhpcy5yZW5kZXJlci52aWV3XG4gICAgdGhpcy5zdGFnZS5hZGRDaGlsZChcbiAgICAgIG5ldyBHcmFwaGljcygpLmRyYXdSZWN0KDAsIDAsIHZpZXcud2lkdGgsIHZpZXcuaGVpZ2h0KVxuICAgIClcblxuICAgIC8vIFN0YXJ0IHRoZSBnYW1lIGxvb3BcbiAgICB0aGlzLnRpY2tlci5hZGQoZGVsdGEgPT4gdGhpcy5nYW1lTG9vcC5iaW5kKHRoaXMpKGRlbHRhKSlcbiAgfVxuXG4gIGdhbWVMb29wIChkZWx0YSkge1xuICAgIC8vIFVwZGF0ZSB0aGUgY3VycmVudCBnYW1lIHN0YXRlOlxuICAgIHRoaXMuY3VycmVudFNjZW5lLnRpY2soZGVsdGEpXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQXBwbGljYXRpb25cbiIsIi8qIGdsb2JhbCBQSVhJLCBCdW1wICovXG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBCdW1wKFBJWEkpXG4iLCJpbXBvcnQgeyBTVEFZIH0gZnJvbSAnLi4vY29uZmlnL2NvbnN0YW50cydcblxuY29uc3QgbyA9IHtcbiAgZ2V0ICh0YXJnZXQsIHByb3BlcnR5KSB7XG4gICAgLy8gaGFzIFNUQVkgb2JqZWN0IHdpbGwgcmV0dXJuIDEsIG90aGVyd2lzZSAwXG4gICAgaWYgKHByb3BlcnR5ID09PSAnd2VpZ2h0Jykge1xuICAgICAgcmV0dXJuIHRhcmdldC5zb21lKG8gPT4gby50eXBlID09PSBTVEFZKSA/IDEgOiAwXG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0YXJnZXRbcHJvcGVydHldXG4gICAgfVxuICB9XG59XG5cbmNsYXNzIEdhbWVPYmplY3RzIHtcbiAgY29uc3RydWN0b3IgKC4uLml0ZW1zKSB7XG4gICAgcmV0dXJuIG5ldyBQcm94eShbLi4uaXRlbXNdLCBvKVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEdhbWVPYmplY3RzXG4iLCJpbXBvcnQgeyBHcmFwaGljcyB9IGZyb20gJy4vUElYSSdcbmltcG9ydCB7IENFSUxfU0laRSB9IGZyb20gJy4uL2NvbmZpZy9jb25zdGFudHMnXG5cbmNvbnN0IExJR0hUID0gU3ltYm9sKCdsaWdodCcpXG5cbmNsYXNzIExpZ2h0IHtcbiAgc3RhdGljIGxpZ2h0T24gKHRhcmdldCwgcmFkaXVzLCByYW5kID0gMSkge1xuICAgIGxldCBjb250YWluZXIgPSB0YXJnZXQucGFyZW50XG4gICAgaWYgKCFjb250YWluZXIubGlnaHRpbmcpIHtcbiAgICAgIC8vIGNvbnRhaW5lciBkb2VzIE5PVCBoYXMgbGlnaHRpbmcgcHJvcGVydHlcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICB2YXIgbGlnaHRidWxiID0gbmV3IEdyYXBoaWNzKClcbiAgICB2YXIgcnIgPSAweGZmXG4gICAgdmFyIHJnID0gMHhmZlxuICAgIHZhciByYiA9IDB4ZmZcbiAgICB2YXIgcmFkID0gcmFkaXVzICogQ0VJTF9TSVpFXG5cbiAgICBsZXQgeCA9IHRhcmdldC53aWR0aCAvIDIgLyB0YXJnZXQuc2NhbGUueFxuICAgIGxldCB5ID0gdGFyZ2V0LmhlaWdodCAvIDIgLyB0YXJnZXQuc2NhbGUueVxuICAgIGxpZ2h0YnVsYi5iZWdpbkZpbGwoKHJyIDw8IDE2KSArIChyZyA8PCA4KSArIHJiLCAxLjApXG4gICAgbGlnaHRidWxiLmRyYXdDaXJjbGUoeCwgeSwgcmFkKVxuICAgIGxpZ2h0YnVsYi5lbmRGaWxsKClcbiAgICBsaWdodGJ1bGIucGFyZW50TGF5ZXIgPSBjb250YWluZXIubGlnaHRpbmcgLy8gbXVzdCBoYXMgcHJvcGVydHk6IGxpZ2h0aW5nXG5cbiAgICB0YXJnZXRbTElHSFRdID0ge1xuICAgICAgbGlnaHQ6IGxpZ2h0YnVsYlxuICAgIH1cbiAgICB0YXJnZXQuYWRkQ2hpbGQobGlnaHRidWxiKVxuXG4gICAgaWYgKHJhbmQgIT09IDEpIHtcbiAgICAgIGxldCBpbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgbGV0IGRTY2FsZSA9IE1hdGgucmFuZG9tKCkgKiAoMSAtIHJhbmQpXG4gICAgICAgIGlmIChsaWdodGJ1bGIuc2NhbGUueCA+IDEpIHtcbiAgICAgICAgICBkU2NhbGUgPSAtZFNjYWxlXG4gICAgICAgIH1cbiAgICAgICAgbGlnaHRidWxiLnNjYWxlLnggKz0gZFNjYWxlXG4gICAgICAgIGxpZ2h0YnVsYi5zY2FsZS55ICs9IGRTY2FsZVxuICAgICAgICBsaWdodGJ1bGIuYWxwaGEgKz0gZFNjYWxlXG4gICAgICB9LCAxMDAwIC8gMTIpXG4gICAgICB0YXJnZXRbTElHSFRdLmludGVydmFsID0gaW50ZXJ2YWxcbiAgICB9XG4gIH1cblxuICBzdGF0aWMgbGlnaHRPZmYgKHRhcmdldCkge1xuICAgIGlmICghdGFyZ2V0W0xJR0hUXSkge1xuICAgICAgLy8gbm8gbGlnaHQgdG8gcmVtb3ZlXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgLy8gcmVtb3ZlIGxpZ2h0XG4gICAgdGFyZ2V0LnJlbW92ZUNoaWxkKHRhcmdldFtMSUdIVF0ubGlnaHQpXG4gICAgLy8gcmVtb3ZlIGludGVydmFsXG4gICAgY2xlYXJJbnRlcnZhbCh0YXJnZXRbTElHSFRdLmludGVydmFsKVxuICAgIGRlbGV0ZSB0YXJnZXRbTElHSFRdXG4gICAgLy8gcmVtb3ZlIGxpc3RlbmVyXG4gICAgdGFyZ2V0Lm9mZigncmVtb3ZlZCcsIExpZ2h0LmxpZ2h0T2ZmKVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IExpZ2h0XG4iLCJpbXBvcnQgeyBDb250YWluZXIsIGRpc3BsYXksIEJMRU5EX01PREVTLCBTcHJpdGUgfSBmcm9tICcuL1BJWEknXG5cbmltcG9ydCB7IFNUQVksIFNUQVRJQywgQ0VJTF9TSVpFLCBBQklMSVRZX01PVkUgfSBmcm9tICcuLi9jb25maWcvY29uc3RhbnRzJ1xuaW1wb3J0IHsgaW5zdGFuY2VCeUl0ZW1JZCB9IGZyb20gJy4vdXRpbHMnXG5pbXBvcnQgTWFwR3JhcGggZnJvbSAnLi9NYXBHcmFwaCdcbmltcG9ydCBidW1wIGZyb20gJy4uL2xpYi9CdW1wJ1xuXG5jb25zdCBwaXBlID0gKGZpcnN0LCAuLi5tb3JlKSA9PlxuICBtb3JlLnJlZHVjZSgoYWNjLCBjdXJyKSA9PiAoLi4uYXJncykgPT4gY3VycihhY2MoLi4uYXJncykpLCBmaXJzdClcblxuLyoqXG4gKiBldmVudHM6XG4gKiAgdXNlOiBvYmplY3RcbiAqL1xuY2xhc3MgTWFwIGV4dGVuZHMgQ29udGFpbmVyIHtcbiAgY29uc3RydWN0b3IgKHNjYWxlID0gMSkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLmNlaWxTaXplID0gc2NhbGUgKiBDRUlMX1NJWkVcbiAgICB0aGlzLm1hcFNjYWxlID0gc2NhbGVcblxuICAgIHRoaXMuY29sbGlkZU9iamVjdHMgPSBbXVxuICAgIHRoaXMucmVwbHlPYmplY3RzID0gW11cbiAgICB0aGlzLnRpY2tPYmplY3RzID0gW11cbiAgICB0aGlzLm1hcCA9IG5ldyBDb250YWluZXIoKVxuICAgIHRoaXMuYWRkQ2hpbGQodGhpcy5tYXApXG5cbiAgICAvLyBwbGF5ZXIgZ3JvdXBcbiAgICB0aGlzLnBsYXllckdyb3VwID0gbmV3IGRpc3BsYXkuR3JvdXAoKVxuICAgIGxldCBwbGF5ZXJMYXllciA9IG5ldyBkaXNwbGF5LkxheWVyKHRoaXMucGxheWVyR3JvdXApXG4gICAgdGhpcy5hZGRDaGlsZChwbGF5ZXJMYXllcilcbiAgICB0aGlzLm1hcEdyYXBoID0gbmV3IE1hcEdyYXBoKClcbiAgfVxuXG4gIGVuYWJsZUZvZyAoKSB7XG4gICAgbGV0IGxpZ2h0aW5nID0gbmV3IGRpc3BsYXkuTGF5ZXIoKVxuICAgIGxpZ2h0aW5nLm9uKCdkaXNwbGF5JywgZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgIGVsZW1lbnQuYmxlbmRNb2RlID0gQkxFTkRfTU9ERVMuQUREXG4gICAgfSlcbiAgICBsaWdodGluZy51c2VSZW5kZXJUZXh0dXJlID0gdHJ1ZVxuICAgIGxpZ2h0aW5nLmNsZWFyQ29sb3IgPSBbMCwgMCwgMCwgMV0gLy8gYW1iaWVudCBncmF5XG5cbiAgICB0aGlzLmFkZENoaWxkKGxpZ2h0aW5nKVxuXG4gICAgdmFyIGxpZ2h0aW5nU3ByaXRlID0gbmV3IFNwcml0ZShsaWdodGluZy5nZXRSZW5kZXJUZXh0dXJlKCkpXG4gICAgbGlnaHRpbmdTcHJpdGUuYmxlbmRNb2RlID0gQkxFTkRfTU9ERVMuTVVMVElQTFlcblxuICAgIHRoaXMuYWRkQ2hpbGQobGlnaHRpbmdTcHJpdGUpXG5cbiAgICB0aGlzLm1hcC5saWdodGluZyA9IGxpZ2h0aW5nXG4gIH1cblxuICAvLyDmtojpmaTov7fpnKdcbiAgZGlzYWJsZUZvZyAoKSB7XG4gICAgdGhpcy5saWdodGluZy5jbGVhckNvbG9yID0gWzEsIDEsIDEsIDFdXG4gIH1cblxuICBsb2FkIChtYXBEYXRhKSB7XG4gICAgbGV0IHRpbGVzID0gbWFwRGF0YS50aWxlc1xuICAgIGxldCBjb2xzID0gbWFwRGF0YS5jb2xzXG4gICAgbGV0IHJvd3MgPSBtYXBEYXRhLnJvd3NcbiAgICBsZXQgaXRlbXMgPSBtYXBEYXRhLml0ZW1zXG5cbiAgICBsZXQgY2VpbFNpemUgPSB0aGlzLmNlaWxTaXplXG4gICAgbGV0IG1hcFNjYWxlID0gdGhpcy5tYXBTY2FsZVxuXG4gICAgaWYgKG1hcERhdGEuaGFzRm9nKSB7XG4gICAgICB0aGlzLmVuYWJsZUZvZygpXG4gICAgfVxuICAgIGxldCBtYXBHcmFwaCA9IHRoaXMubWFwR3JhcGhcblxuICAgIGxldCBhZGRHYW1lT2JqZWN0ID0gKGksIGosIGlkLCBwYXJhbXMpID0+IHtcbiAgICAgIGxldCBvID0gaW5zdGFuY2VCeUl0ZW1JZChpZCwgcGFyYW1zKVxuICAgICAgby5wb3NpdGlvbi5zZXQoaSAqIGNlaWxTaXplLCBqICogY2VpbFNpemUpXG4gICAgICBvLnNjYWxlLnNldChtYXBTY2FsZSwgbWFwU2NhbGUpXG5cbiAgICAgIHN3aXRjaCAoby50eXBlKSB7XG4gICAgICAgIGNhc2UgU1RBVElDOlxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgU1RBWTpcbiAgICAgICAgICAvLyDpnZzmhYvnianku7ZcbiAgICAgICAgICB0aGlzLmNvbGxpZGVPYmplY3RzLnB1c2gobylcbiAgICAgICAgICBicmVha1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRoaXMucmVwbHlPYmplY3RzLnB1c2gobylcbiAgICAgIH1cbiAgICAgIHRoaXMubWFwLmFkZENoaWxkKG8pXG5cbiAgICAgIHJldHVybiBbbywgaSwgal1cbiAgICB9XG5cbiAgICBsZXQgYWRkR3JhcGggPSAoW28sIGksIGpdKSA9PiBtYXBHcmFwaC5hZGRPYmplY3QobywgaSwgailcblxuICAgIGxldCByZWdpc3Rlck9uID0gKFtvLCBpLCBqXSkgPT4ge1xuICAgICAgby5vbigndXNlJywgKCkgPT4gdGhpcy5lbWl0KCd1c2UnLCBvKSlcbiAgICAgIG8ub24oJ3JlbW92ZWQnLCAoKSA9PiB7XG4gICAgICAgIGxldCBpbnggPSB0aGlzLnJlcGx5T2JqZWN0cy5pbmRleE9mKG8pXG4gICAgICAgIHRoaXMucmVwbHlPYmplY3RzLnNwbGljZShpbngsIDEpXG4gICAgICAgIC8vIFRPRE86IHJlbW92ZSBtYXAgaXRlbVxuICAgICAgICAvLyBkZWxldGUgaXRlbXNbaV1cbiAgICAgIH0pXG4gICAgICByZXR1cm4gW28sIGksIGpdXG4gICAgfVxuXG4gICAgbWFwR3JhcGguYmVnaW5VcGRhdGUoKVxuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb2xzOyBpKyspIHtcbiAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgcm93czsgaisrKSB7XG4gICAgICAgIHBpcGUoYWRkR2FtZU9iamVjdCwgYWRkR3JhcGgpKGksIGosIHRpbGVzW2ogKiBjb2xzICsgaV0pXG4gICAgICB9XG4gICAgfVxuICAgIGl0ZW1zLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICBsZXQgWyBpZCwgW2ksIGpdLCBwYXJhbXMgXSA9IGl0ZW1cbiAgICAgIHBpcGUoYWRkR2FtZU9iamVjdCwgcmVnaXN0ZXJPbiwgYWRkR3JhcGgpKGksIGosIGlkLCBwYXJhbXMpXG4gICAgfSlcblxuICAgIG1hcEdyYXBoLmVuZFVwZGF0ZSgpXG4gIH1cblxuICBhZGRQbGF5ZXIgKHBsYXllciwgdG9Qb3NpdGlvbikge1xuICAgIHBsYXllci5wb3NpdGlvbi5zZXQoXG4gICAgICB0b1Bvc2l0aW9uWzBdICogdGhpcy5jZWlsU2l6ZSxcbiAgICAgIHRvUG9zaXRpb25bMV0gKiB0aGlzLmNlaWxTaXplXG4gICAgKVxuICAgIHBsYXllci5zY2FsZS5zZXQodGhpcy5tYXBTY2FsZSwgdGhpcy5tYXBTY2FsZSlcbiAgICBwbGF5ZXIucGFyZW50R3JvdXAgPSB0aGlzLnBsYXllckdyb3VwXG4gICAgdGhpcy5tYXAuYWRkQ2hpbGQocGxheWVyKVxuXG4gICAgcGxheWVyLm9uUGxhY2UgPSB0aGlzLmFkZEdhbWVPYmplY3QuYmluZCh0aGlzLCBwbGF5ZXIpXG4gICAgcGxheWVyLm9uKCdwbGFjZScsIHBsYXllci5vblBsYWNlKVxuICAgIHBsYXllci5vbmNlKCdyZW1vdmVkJywgKCkgPT4ge1xuICAgICAgcGxheWVyLm9mZigncGxhY2UnLCBwbGF5ZXIub25QbGFjZSlcbiAgICB9KVxuICAgIHBsYXllci5vbkZpcmUgPSB0aGlzLm9uRmlyZS5iaW5kKHRoaXMpXG4gICAgcGxheWVyLm9uKCdmaXJlJywgcGxheWVyLm9uRmlyZSlcbiAgICBwbGF5ZXIub25jZSgncmVtb3ZlZCcsICgpID0+IHtcbiAgICAgIHBsYXllci5vZmYoJ2ZpcmUnLCBwbGF5ZXIub25GaXJlKVxuICAgIH0pXG4gICAgdGhpcy50aWNrT2JqZWN0cy5wdXNoKHBsYXllcilcblxuICAgIC8vIOiHquWLleaJvui3r1xuICAgIGxldCBtb3ZlQWJpbGl0eSA9IHBsYXllcltBQklMSVRZX01PVkVdXG4gICAgaWYgKG1vdmVBYmlsaXR5KSB7XG4gICAgICBsZXQgcG9pbnRzID0gWyc0LDEnLCAnNCw0JywgJzExLDEnLCAnNiwxMCddXG4gICAgICBwb2ludHMucmVkdWNlKChhY2MsIGN1cikgPT4ge1xuICAgICAgICBsZXQgcGF0aCA9IHRoaXMubWFwR3JhcGguZmluZChhY2MsIGN1cikubWFwKG5vZGUgPT4ge1xuICAgICAgICAgIGxldCBbaSwgal0gPSBub2RlLmlkLnNwbGl0KCcsJylcbiAgICAgICAgICByZXR1cm4ge3g6IGkgKiB0aGlzLmNlaWxTaXplLCB5OiBqICogdGhpcy5jZWlsU2l6ZX1cbiAgICAgICAgfSlcbiAgICAgICAgbW92ZUFiaWxpdHkuYWRkUGF0aChwYXRoKVxuICAgICAgICByZXR1cm4gY3VyXG4gICAgICB9KVxuICAgIH1cbiAgfVxuXG4gIHRpY2sgKGRlbHRhKSB7XG4gICAgbGV0IG9iamVjdHMgPSB0aGlzLnRpY2tPYmplY3RzXG4gICAgb2JqZWN0cy5mb3JFYWNoKG8gPT4gby50aWNrKGRlbHRhKSlcbiAgICAvLyBjb2xsaWRlIGRldGVjdFxuICAgIGZvciAobGV0IGkgPSB0aGlzLmNvbGxpZGVPYmplY3RzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICBmb3IgKGxldCBqID0gb2JqZWN0cy5sZW5ndGggLSAxOyBqID49IDA7IGotLSkge1xuICAgICAgICBsZXQgbyA9IHRoaXMuY29sbGlkZU9iamVjdHNbaV1cbiAgICAgICAgbGV0IG8yID0gb2JqZWN0c1tqXVxuICAgICAgICBpZiAoYnVtcC5yZWN0YW5nbGVDb2xsaXNpb24obzIsIG8sIHRydWUpKSB7XG4gICAgICAgICAgby5lbWl0KCdjb2xsaWRlJywgbzIpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gdGhpcy5yZXBseU9iamVjdHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgIGZvciAobGV0IGogPSBvYmplY3RzLmxlbmd0aCAtIDE7IGogPj0gMDsgai0tKSB7XG4gICAgICAgIGxldCBvID0gdGhpcy5yZXBseU9iamVjdHNbaV1cbiAgICAgICAgbGV0IG8yID0gb2JqZWN0c1tqXVxuICAgICAgICBpZiAoYnVtcC5oaXRUZXN0UmVjdGFuZ2xlKG8yLCBvKSkge1xuICAgICAgICAgIG8uZW1pdCgnY29sbGlkZScsIG8yKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYWRkR2FtZU9iamVjdCAocGxheWVyLCBvYmplY3QpIHtcbiAgICBsZXQgbWFwU2NhbGUgPSB0aGlzLm1hcFNjYWxlXG4gICAgbGV0IHBvc2l0aW9uID0gcGxheWVyLnBvc2l0aW9uXG4gICAgb2JqZWN0LnBvc2l0aW9uLnNldChwb3NpdGlvbi54LnRvRml4ZWQoMCksIHBvc2l0aW9uLnkudG9GaXhlZCgwKSlcbiAgICBvYmplY3Quc2NhbGUuc2V0KG1hcFNjYWxlLCBtYXBTY2FsZSlcbiAgICB0aGlzLm1hcC5hZGRDaGlsZChvYmplY3QpXG4gIH1cblxuICBvbkZpcmUgKGJ1bGxldCkge1xuICAgIGJ1bGxldC5vbignY29sbGlkZScsICgpID0+IHtcbiAgICAgIGxldCBpbnggPSB0aGlzLnRpY2tPYmplY3RzLmluZGV4T2YoYnVsbGV0KVxuICAgICAgdGhpcy50aWNrT2JqZWN0cy5zcGxpY2UoaW54LCAxKVxuICAgIH0pXG4gICAgdGhpcy50aWNrT2JqZWN0cy5wdXNoKGJ1bGxldClcbiAgICB0aGlzLm1hcC5hZGRDaGlsZChidWxsZXQpXG4gIH1cblxuICAvLyBmb2cg55qEIHBhcmVudCBjb250YWluZXIg5LiN6IO96KKr56e75YuVKOacg+mMr+S9jSnvvIzlm6DmraTmlLnmiJDkv67mlLkgbWFwIOS9jee9rlxuICBnZXQgcG9zaXRpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm1hcC5wb3NpdGlvblxuICB9XG5cbiAgZ2V0IHggKCkge1xuICAgIHJldHVybiB0aGlzLm1hcC54XG4gIH1cblxuICBnZXQgeSAoKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwLnlcbiAgfVxuXG4gIHNldCB4ICh4KSB7XG4gICAgdGhpcy5tYXAueCA9IHhcbiAgfVxuXG4gIHNldCB5ICh5KSB7XG4gICAgdGhpcy5tYXAueSA9IHlcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBNYXBcbiIsImltcG9ydCBjcmVhdGVHcmFwaCBmcm9tICduZ3JhcGguZ3JhcGgnXG5pbXBvcnQgcGF0aCBmcm9tICduZ3JhcGgucGF0aCdcbmltcG9ydCBHYW1lT2JqZWN0cyBmcm9tICcuL0dhbWVPYmplY3RzJ1xuXG5jbGFzcyBNYXBHcmFwaCB7XG4gIGNvbnN0cnVjdG9yIChzY2FsZSA9IDEpIHtcbiAgICB0aGlzLl9ncmFwaCA9IGNyZWF0ZUdyYXBoKClcbiAgICB0aGlzLl9maW5kZXIgPSBwYXRoLmFTdGFyKHRoaXMuX2dyYXBoLCB7XG4gICAgICAvLyBXZSB0ZWxsIG91ciBwYXRoZmluZGVyIHdoYXQgc2hvdWxkIGl0IHVzZSBhcyBhIGRpc3RhbmNlIGZ1bmN0aW9uOlxuICAgICAgZGlzdGFuY2UgKGZyb21Ob2RlLCB0b05vZGUsIGxpbmspIHtcbiAgICAgICAgcmV0dXJuIGZyb21Ob2RlLmRhdGEud2VpZ2h0ICsgdG9Ob2RlLmRhdGEud2VpZ2h0ICsgMVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBhZGRPYmplY3QgKG8sIGksIGopIHtcbiAgICBsZXQgZ3JhcGggPSB0aGlzLl9ncmFwaFxuXG4gICAgbGV0IHNlbGZOYW1lID0gW2ksIGpdLmpvaW4oJywnKVxuICAgIGxldCBub2RlID0gZ3JhcGguZ2V0Tm9kZShzZWxmTmFtZSlcbiAgICBpZiAoIW5vZGUpIHtcbiAgICAgIG5vZGUgPSBncmFwaC5hZGROb2RlKHNlbGZOYW1lLCBuZXcgR2FtZU9iamVjdHMobykpXG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUuZGF0YS5wdXNoKG8pXG4gICAgfVxuICAgIGxldCBsaW5rID0gKHNlbGZOb2RlLCBvdGhlck5vZGUpID0+IHtcbiAgICAgIGlmICghc2VsZk5vZGUgfHwgIW90aGVyTm9kZSB8fCBncmFwaC5nZXRMaW5rKHNlbGZOb2RlLmlkLCBvdGhlck5vZGUuaWQpKSB7XG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgbGV0IHdlaWdodCA9IHNlbGZOb2RlLmRhdGEud2VpZ2h0ICsgb3RoZXJOb2RlLmRhdGEud2VpZ2h0XG4gICAgICBpZiAod2VpZ2h0ID09PSAwKSB7XG4gICAgICAgIGdyYXBoLmFkZExpbmsoc2VsZk5vZGUuaWQsIG90aGVyTm9kZS5pZClcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG5vZGUuZGF0YS53ZWlnaHQgIT09IDApIHtcbiAgICAgIC8vIOatpOm7nuS4jemAmu+8jOenu+mZpOaJgOaciemAo+e1kFxuICAgICAgZ3JhcGguZm9yRWFjaExpbmtlZE5vZGUoc2VsZk5hbWUsIGZ1bmN0aW9uIChsaW5rZWROb2RlLCBsaW5rKSB7XG4gICAgICAgIGdyYXBoLnJlbW92ZUxpbmsobGluaylcbiAgICAgIH0pXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgbGluayhub2RlLCBncmFwaC5nZXROb2RlKFtpIC0gMSwgal0uam9pbignLCcpKSlcbiAgICBsaW5rKG5vZGUsIGdyYXBoLmdldE5vZGUoW2ksIGogLSAxXS5qb2luKCcsJykpKVxuICAgIGxpbmsoZ3JhcGguZ2V0Tm9kZShbaSArIDEsIGpdLmpvaW4oJywnKSksIG5vZGUpXG4gICAgbGluayhncmFwaC5nZXROb2RlKFtpLCBqICsgMV0uam9pbignLCcpKSwgbm9kZSlcbiAgfVxuXG4gIGZpbmQgKGZyb20sIHRvKSB7XG4gICAgcmV0dXJuIHRoaXMuX2ZpbmRlci5maW5kKGZyb20sIHRvKVxuICB9XG5cbiAgYmVnaW5VcGRhdGUgKCkge1xuICAgIHRoaXMuX2dyYXBoLmJlZ2luVXBkYXRlKClcbiAgfVxuXG4gIGVuZFVwZGF0ZSAoKSB7XG4gICAgdGhpcy5fZ3JhcGguZW5kVXBkYXRlKClcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBNYXBHcmFwaFxuIiwiaW1wb3J0IEV2ZW50RW1pdHRlciBmcm9tICdldmVudHMnXG5cbmNvbnN0IE1BWF9NRVNTQUdFX0NPVU5UID0gNTAwXG5cbmNsYXNzIE1lc3NhZ2VzIGV4dGVuZHMgRXZlbnRFbWl0dGVyIHtcbiAgY29uc3RydWN0b3IgKCkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLl9tZXNzYWdlcyA9IFtdXG4gIH1cblxuICBnZXQgbGlzdCAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX21lc3NhZ2VzXG4gIH1cblxuICBhZGQgKG1zZykge1xuICAgIGxldCBsZW5ndGggPSB0aGlzLl9tZXNzYWdlcy51bnNoaWZ0KG1zZylcbiAgICBpZiAobGVuZ3RoID4gTUFYX01FU1NBR0VfQ09VTlQpIHtcbiAgICAgIHRoaXMuX21lc3NhZ2VzLnBvcCgpXG4gICAgfVxuICAgIHRoaXMuZW1pdCgnbW9kaWZpZWQnKVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IG5ldyBNZXNzYWdlcygpXG4iLCIvKiBnbG9iYWwgUElYSSAqL1xuXG5leHBvcnQgY29uc3QgQXBwbGljYXRpb24gPSBQSVhJLkFwcGxpY2F0aW9uXG5leHBvcnQgY29uc3QgQ29udGFpbmVyID0gUElYSS5Db250YWluZXJcbmV4cG9ydCBjb25zdCBsb2FkZXIgPSBQSVhJLmxvYWRlclxuZXhwb3J0IGNvbnN0IHJlc291cmNlcyA9IFBJWEkubG9hZGVyLnJlc291cmNlc1xuZXhwb3J0IGNvbnN0IFNwcml0ZSA9IFBJWEkuU3ByaXRlXG5leHBvcnQgY29uc3QgVGV4dCA9IFBJWEkuVGV4dFxuZXhwb3J0IGNvbnN0IFRleHRTdHlsZSA9IFBJWEkuVGV4dFN0eWxlXG5cbmV4cG9ydCBjb25zdCBHcmFwaGljcyA9IFBJWEkuR3JhcGhpY3NcbmV4cG9ydCBjb25zdCBCTEVORF9NT0RFUyA9IFBJWEkuQkxFTkRfTU9ERVNcbmV4cG9ydCBjb25zdCBkaXNwbGF5ID0gUElYSS5kaXNwbGF5XG5leHBvcnQgY29uc3QgdXRpbHMgPSBQSVhJLnV0aWxzXG4iLCJpbXBvcnQgeyBkaXNwbGF5IH0gZnJvbSAnLi9QSVhJJ1xuXG5jbGFzcyBTY2VuZSBleHRlbmRzIGRpc3BsYXkuTGF5ZXIge1xuICBjcmVhdGUgKCkge31cblxuICBkZXN0cm95ICgpIHt9XG5cbiAgdGljayAoZGVsdGEpIHt9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFNjZW5lXG4iLCJpbXBvcnQgeyByZXNvdXJjZXMgfSBmcm9tICcuLi9saWIvUElYSSdcblxuY29uc3QgVGV4dHVyZSA9IHtcbiAgZ2V0IFRlcnJhaW5BdGxhcyAoKSB7XG4gICAgcmV0dXJuIHJlc291cmNlc1snaW1hZ2VzL3RlcnJhaW5fYXRsYXMuanNvbiddXG4gIH0sXG4gIGdldCBCYXNlT3V0QXRsYXMgKCkge1xuICAgIHJldHVybiByZXNvdXJjZXNbJ2ltYWdlcy9iYXNlX291dF9hdGxhcy5qc29uJ11cbiAgfSxcblxuICBnZXQgQWlyICgpIHtcbiAgICByZXR1cm4gVGV4dHVyZS5UZXJyYWluQXRsYXMudGV4dHVyZXNbJ2VtcHR5LnBuZyddXG4gIH0sXG4gIGdldCBHcmFzcyAoKSB7XG4gICAgcmV0dXJuIFRleHR1cmUuVGVycmFpbkF0bGFzLnRleHR1cmVzWydncmFzcy5wbmcnXVxuICB9LFxuICBnZXQgR3JvdW5kICgpIHtcbiAgICByZXR1cm4gVGV4dHVyZS5UZXJyYWluQXRsYXMudGV4dHVyZXNbJ2JyaWNrLXRpbGUucG5nJ11cbiAgfSxcblxuICBnZXQgV2FsbCAoKSB7XG4gICAgcmV0dXJuIFRleHR1cmUuVGVycmFpbkF0bGFzLnRleHR1cmVzWyd3YWxsLnBuZyddXG4gIH0sXG4gIGdldCBJcm9uRmVuY2UgKCkge1xuICAgIHJldHVybiBUZXh0dXJlLkJhc2VPdXRBdGxhcy50ZXh0dXJlc1snaXJvbi1mZW5jZS5wbmcnXVxuICB9LFxuICBnZXQgUm9vdCAoKSB7XG4gICAgcmV0dXJuIFRleHR1cmUuVGVycmFpbkF0bGFzLnRleHR1cmVzWydyb290LnBuZyddXG4gIH0sXG4gIGdldCBUcmVlICgpIHtcbiAgICByZXR1cm4gVGV4dHVyZS5UZXJyYWluQXRsYXMudGV4dHVyZXNbJ3RyZWUucG5nJ11cbiAgfSxcblxuICBnZXQgVHJlYXN1cmUgKCkge1xuICAgIHJldHVybiBUZXh0dXJlLkJhc2VPdXRBdGxhcy50ZXh0dXJlc1sndHJlYXN1cmUucG5nJ11cbiAgfSxcbiAgZ2V0IERvb3IgKCkge1xuICAgIHJldHVybiBUZXh0dXJlLkJhc2VPdXRBdGxhcy50ZXh0dXJlc1snaXJvbi1mZW5jZS5wbmcnXVxuICB9LFxuICBnZXQgVG9yY2ggKCkge1xuICAgIHJldHVybiBUZXh0dXJlLkJhc2VPdXRBdGxhcy50ZXh0dXJlc1sndG9yY2gucG5nJ11cbiAgfSxcbiAgZ2V0IEdyYXNzRGVjb3JhdGUxICgpIHtcbiAgICByZXR1cm4gVGV4dHVyZS5UZXJyYWluQXRsYXMudGV4dHVyZXNbJ2dyYXNzLWRlY29yYXRlLTEucG5nJ11cbiAgfSxcbiAgZ2V0IEJ1bGxldCAoKSB7XG4gICAgcmV0dXJuIFRleHR1cmUuQmFzZU91dEF0bGFzLnRleHR1cmVzWydidWxsZXQucG5nJ11cbiAgfSxcblxuICBnZXQgUm9jayAoKSB7XG4gICAgcmV0dXJuIFRleHR1cmUuVGVycmFpbkF0bGFzLnRleHR1cmVzWydyb2NrLnBuZyddXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVGV4dHVyZVxuIiwiY29uc3QgZGVncmVlcyA9IDE4MCAvIE1hdGguUElcblxuY2xhc3MgVmVjdG9yIHtcbiAgY29uc3RydWN0b3IgKHgsIHkpIHtcbiAgICB0aGlzLnggPSB4XG4gICAgdGhpcy55ID0geVxuICB9XG5cbiAgc3RhdGljIGZyb21Qb2ludCAocCkge1xuICAgIHJldHVybiBuZXcgVmVjdG9yKHAueCwgcC55KVxuICB9XG5cbiAgc3RhdGljIGZyb21EZWdMZW5ndGggKGRlZywgbGVuZ3RoKSB7XG4gICAgbGV0IHggPSBsZW5ndGggKiBNYXRoLmNvcyhkZWcpXG4gICAgbGV0IHkgPSBsZW5ndGggKiBNYXRoLnNpbihkZWcpXG4gICAgcmV0dXJuIG5ldyBWZWN0b3IoeCwgeSlcbiAgfVxuXG4gIGNsb25lICgpIHtcbiAgICByZXR1cm4gbmV3IFZlY3Rvcih0aGlzLngsIHRoaXMueSlcbiAgfVxuXG4gIGFkZCAodikge1xuICAgIHRoaXMueCArPSB2LnhcbiAgICB0aGlzLnkgKz0gdi55XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHN1YiAodikge1xuICAgIHRoaXMueCAtPSB2LnhcbiAgICB0aGlzLnkgLT0gdi55XG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIGludmVydCAoKSB7XG4gICAgcmV0dXJuIHRoaXMubXVsdGlwbHlTY2FsYXIoLTEpXG4gIH1cblxuICBtdWx0aXBseVNjYWxhciAocykge1xuICAgIHRoaXMueCAqPSBzXG4gICAgdGhpcy55ICo9IHNcbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgZGl2aWRlU2NhbGFyIChzKSB7XG4gICAgaWYgKHMgPT09IDApIHtcbiAgICAgIHRoaXMueCA9IDBcbiAgICAgIHRoaXMueSA9IDBcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMubXVsdGlwbHlTY2FsYXIoMSAvIHMpXG4gICAgfVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBkb3QgKHYpIHtcbiAgICByZXR1cm4gdGhpcy54ICogdi54ICsgdGhpcy55ICogdi55XG4gIH1cblxuICBnZXQgbGVuZ3RoICgpIHtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMueCAqIHRoaXMueCArIHRoaXMueSAqIHRoaXMueSlcbiAgfVxuXG4gIGxlbmd0aFNxICgpIHtcbiAgICByZXR1cm4gdGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55XG4gIH1cblxuICBub3JtYWxpemUgKCkge1xuICAgIHJldHVybiB0aGlzLmRpdmlkZVNjYWxhcih0aGlzLmxlbmd0aClcbiAgfVxuXG4gIGRpc3RhbmNlVG8gKHYpIHtcbiAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMuZGlzdGFuY2VUb1NxKHYpKVxuICB9XG5cbiAgZGlzdGFuY2VUb1NxICh2KSB7XG4gICAgbGV0IGR4ID0gdGhpcy54IC0gdi54XG4gICAgbGV0IGR5ID0gdGhpcy55IC0gdi55XG4gICAgcmV0dXJuIGR4ICogZHggKyBkeSAqIGR5XG4gIH1cblxuICBzZXQgKHgsIHkpIHtcbiAgICB0aGlzLnggPSB4XG4gICAgdGhpcy55ID0geVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzZXRYICh4KSB7XG4gICAgdGhpcy54ID0geFxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzZXRZICh5KSB7XG4gICAgdGhpcy55ID0geVxuICAgIHJldHVybiB0aGlzXG4gIH1cblxuICBzZXRMZW5ndGggKGwpIHtcbiAgICB2YXIgb2xkTGVuZ3RoID0gdGhpcy5sZW5ndGhcbiAgICBpZiAob2xkTGVuZ3RoICE9PSAwICYmIGwgIT09IG9sZExlbmd0aCkge1xuICAgICAgdGhpcy5tdWx0aXBseVNjYWxhcihsIC8gb2xkTGVuZ3RoKVxuICAgIH1cbiAgICByZXR1cm4gdGhpc1xuICB9XG5cbiAgbGVycCAodiwgYWxwaGEpIHtcbiAgICB0aGlzLnggKz0gKHYueCAtIHRoaXMueCkgKiBhbHBoYVxuICAgIHRoaXMueSArPSAodi55IC0gdGhpcy55KSAqIGFscGhhXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIHJhZCAoKSB7XG4gICAgcmV0dXJuIE1hdGguYXRhbjIodGhpcy55LCB0aGlzLngpXG4gIH1cblxuICBnZXQgZGVnICgpIHtcbiAgICByZXR1cm4gdGhpcy5yYWQoKSAqIGRlZ3JlZXNcbiAgfVxuXG4gIGVxdWFscyAodikge1xuICAgIHJldHVybiB0aGlzLnggPT09IHYueCAmJiB0aGlzLnkgPT09IHYueVxuICB9XG5cbiAgcm90YXRlICh0aGV0YSkge1xuICAgIHZhciB4dGVtcCA9IHRoaXMueFxuICAgIHRoaXMueCA9IHRoaXMueCAqIE1hdGguY29zKHRoZXRhKSAtIHRoaXMueSAqIE1hdGguc2luKHRoZXRhKVxuICAgIHRoaXMueSA9IHh0ZW1wICogTWF0aC5zaW4odGhldGEpICsgdGhpcy55ICogTWF0aC5jb3ModGhldGEpXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBWZWN0b3JcbiIsImltcG9ydCBXYWxsIGZyb20gJy4uL29iamVjdHMvV2FsbCdcbmltcG9ydCBBaXIgZnJvbSAnLi4vb2JqZWN0cy9BaXInXG5pbXBvcnQgR3Jhc3MgZnJvbSAnLi4vb2JqZWN0cy9HcmFzcydcbmltcG9ydCBUcmVhc3VyZSBmcm9tICcuLi9vYmplY3RzL1RyZWFzdXJlJ1xuaW1wb3J0IERvb3IgZnJvbSAnLi4vb2JqZWN0cy9Eb29yJ1xuaW1wb3J0IFRvcmNoIGZyb20gJy4uL29iamVjdHMvVG9yY2gnXG5pbXBvcnQgR3JvdW5kIGZyb20gJy4uL29iamVjdHMvR3JvdW5kJ1xuaW1wb3J0IElyb25GZW5jZSBmcm9tICcuLi9vYmplY3RzL0lyb25GZW5jZSdcbmltcG9ydCBSb290IGZyb20gJy4uL29iamVjdHMvUm9vdCdcbmltcG9ydCBUcmVlIGZyb20gJy4uL29iamVjdHMvVHJlZSdcbmltcG9ydCBHcmFzc0RlY29yYXRlMSBmcm9tICcuLi9vYmplY3RzL0dyYXNzRGVjb3JhdGUxJ1xuaW1wb3J0IEJ1bGxldCBmcm9tICcuLi9vYmplY3RzL0J1bGxldCdcblxuaW1wb3J0IE1vdmUgZnJvbSAnLi4vb2JqZWN0cy9hYmlsaXRpZXMvTW92ZSdcbmltcG9ydCBDYW1lcmEgZnJvbSAnLi4vb2JqZWN0cy9hYmlsaXRpZXMvQ2FtZXJhJ1xuaW1wb3J0IE9wZXJhdGUgZnJvbSAnLi4vb2JqZWN0cy9hYmlsaXRpZXMvT3BlcmF0ZSdcblxuLy8gMHgwMDAwIH4gMHgwMDBmXG5jb25zdCBJdGVtc1N0YXRpYyA9IFtcbiAgQWlyLCBHcmFzcywgR3JvdW5kXG5dXG4vLyAweDAwMTAgfiAweDAwZmZcbmNvbnN0IEl0ZW1zU3RheSA9IFtcbiAgLy8gMHgwMDEwLCAweDAwMTEsIDB4MDAxMlxuICBXYWxsLCBJcm9uRmVuY2UsIFJvb3QsIFRyZWVcbl1cbi8vIDB4MDEwMCB+IDB4MDFmZlxuY29uc3QgSXRlbXNPdGhlciA9IFtcbiAgVHJlYXN1cmUsIERvb3IsIFRvcmNoLCBHcmFzc0RlY29yYXRlMSwgQnVsbGV0XG5dXG4vLyAweDAyMDAgfiAweDAyZmZcbmNvbnN0IEFiaWxpdGllcyA9IFtcbiAgTW92ZSwgQ2FtZXJhLCBPcGVyYXRlXG5dXG5cbmV4cG9ydCBmdW5jdGlvbiBpbnN0YW5jZUJ5SXRlbUlkIChpdGVtSWQsIHBhcmFtcykge1xuICBsZXQgVHlwZXNcbiAgaXRlbUlkID0gcGFyc2VJbnQoaXRlbUlkLCAxNilcbiAgaWYgKChpdGVtSWQgJiAweGZmZjApID09PSAwKSB7XG4gICAgLy8g5Zyw5p2/XG4gICAgVHlwZXMgPSBJdGVtc1N0YXRpY1xuICB9IGVsc2UgaWYgKChpdGVtSWQgJiAweGZmMDApID09PSAwKSB7XG4gICAgVHlwZXMgPSBJdGVtc1N0YXlcbiAgICBpdGVtSWQgLT0gMHgwMDEwXG4gIH0gZWxzZSBpZiAoKGl0ZW1JZCAmIDB4ZmYwMCkgPj4+IDggPT09IDEpIHtcbiAgICBUeXBlcyA9IEl0ZW1zT3RoZXJcbiAgICBpdGVtSWQgLT0gMHgwMTAwXG4gIH0gZWxzZSB7XG4gICAgVHlwZXMgPSBBYmlsaXRpZXNcbiAgICBpdGVtSWQgLT0gMHgwMjAwXG4gIH1cbiAgcmV0dXJuIG5ldyBUeXBlc1tpdGVtSWRdKHBhcmFtcylcbn1cbiIsImltcG9ydCBUZXh0dXJlIGZyb20gJy4uL2xpYi9UZXh0dXJlJ1xuaW1wb3J0IEdhbWVPYmplY3QgZnJvbSAnLi9HYW1lT2JqZWN0J1xuXG5pbXBvcnQgeyBTVEFUSUMgfSBmcm9tICcuLi9jb25maWcvY29uc3RhbnRzJ1xuXG5jbGFzcyBBaXIgZXh0ZW5kcyBHYW1lT2JqZWN0IHtcbiAgY29uc3RydWN0b3IgKCkge1xuICAgIC8vIENyZWF0ZSB0aGUgY2F0IHNwcml0ZVxuICAgIHN1cGVyKFRleHR1cmUuQWlyKVxuICB9XG5cbiAgZ2V0IHR5cGUgKCkgeyByZXR1cm4gU1RBVElDIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQWlyXG4iLCJpbXBvcnQgVGV4dHVyZSBmcm9tICcuLi9saWIvVGV4dHVyZSdcbmltcG9ydCBHYW1lT2JqZWN0IGZyb20gJy4vR2FtZU9iamVjdCdcbmltcG9ydCB7IFJFUExZLCBBQklMSVRZX01PVkUgfSBmcm9tICcuLi9jb25maWcvY29uc3RhbnRzJ1xuXG5pbXBvcnQgTGVhcm4gZnJvbSAnLi9hYmlsaXRpZXMvTGVhcm4nXG5pbXBvcnQgTW92ZSBmcm9tICcuLi9vYmplY3RzL2FiaWxpdGllcy9Nb3ZlJ1xuXG5jbGFzcyBCdWxsZXQgZXh0ZW5kcyBHYW1lT2JqZWN0IHtcbiAgY29uc3RydWN0b3IgKHNwZWVkKSB7XG4gICAgc3VwZXIoVGV4dHVyZS5CdWxsZXQpXG5cbiAgICBuZXcgTGVhcm4oKS5jYXJyeUJ5KHRoaXMpXG4gICAgICAubGVhcm4obmV3IE1vdmUoW3NwZWVkLCAwXSkpXG5cbiAgICB0aGlzLm9uKCdjb2xsaWRlJywgdGhpcy5hY3Rpb25XaXRoLmJpbmQodGhpcykpXG4gIH1cblxuICBnZXQgdHlwZSAoKSB7IHJldHVybiBSRVBMWSB9XG5cbiAgYWN0aW9uV2l0aCAob3BlcmF0b3IpIHtcbiAgICBpZiAob3BlcmF0b3IgPT09IHRoaXMub3duZXIpIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBzdXBlci5zYXkoW1xuICAgICAgJ2hpdHRlZCAnLFxuICAgICAgb3BlcmF0b3IudG9TdHJpbmcoKSxcbiAgICAgICcuJ1xuICAgIF0uam9pbignJykpXG5cbiAgICB0aGlzLnBhcmVudC5yZW1vdmVDaGlsZCh0aGlzKVxuICAgIHRoaXMuZGVzdHJveSgpXG4gIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdCdWxsZXQnXG4gIH1cblxuICBzYXkgKCkge1xuICAgIC8vIHNheSBub3RoaW5nXG4gIH1cblxuICBzZXREaXJlY3Rpb24gKHBvaW50KSB7XG4gICAgbGV0IG1vdmVBYmlsaXR5ID0gdGhpc1tBQklMSVRZX01PVkVdXG4gICAgaWYgKG1vdmVBYmlsaXR5KSB7XG4gICAgICBtb3ZlQWJpbGl0eS5zZXREaXJlY3Rpb24ocG9pbnQpXG4gICAgfVxuICB9XG5cbiAgdGljayAoZGVsdGEpIHtcbiAgICBPYmplY3QudmFsdWVzKHRoaXMudGlja0FiaWxpdGllcykuZm9yRWFjaChhYmlsaXR5ID0+IGFiaWxpdHkudGljayhkZWx0YSwgdGhpcykpXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQnVsbGV0XG4iLCJpbXBvcnQgVGV4dHVyZSBmcm9tICcuLi9saWIvVGV4dHVyZSdcbmltcG9ydCBHYW1lT2JqZWN0IGZyb20gJy4vR2FtZU9iamVjdCdcblxuaW1wb3J0IExlYXJuIGZyb20gJy4vYWJpbGl0aWVzL0xlYXJuJ1xuaW1wb3J0IE1vdmUgZnJvbSAnLi4vb2JqZWN0cy9hYmlsaXRpZXMvTW92ZSdcbmltcG9ydCBLZXlNb3ZlIGZyb20gJy4uL29iamVjdHMvYWJpbGl0aWVzL0tleU1vdmUnXG5pbXBvcnQgQ2FtZXJhIGZyb20gJy4uL29iamVjdHMvYWJpbGl0aWVzL0NhbWVyYSdcbmltcG9ydCBDYXJyeSBmcm9tICcuLi9vYmplY3RzL2FiaWxpdGllcy9DYXJyeSdcbmltcG9ydCBQbGFjZSBmcm9tICcuLi9vYmplY3RzL2FiaWxpdGllcy9QbGFjZSdcbmltcG9ydCBLZXlQbGFjZSBmcm9tICcuLi9vYmplY3RzL2FiaWxpdGllcy9LZXlQbGFjZSdcbmltcG9ydCBGaXJlIGZyb20gJy4uL29iamVjdHMvYWJpbGl0aWVzL0ZpcmUnXG5pbXBvcnQgS2V5RmlyZSBmcm9tICcuLi9vYmplY3RzL2FiaWxpdGllcy9LZXlGaXJlJ1xuXG5jbGFzcyBDYXQgZXh0ZW5kcyBHYW1lT2JqZWN0IHtcbiAgY29uc3RydWN0b3IgKCkge1xuICAgIHN1cGVyKFRleHR1cmUuUm9jaylcblxuICAgIG5ldyBMZWFybigpLmNhcnJ5QnkodGhpcylcbiAgICAgIC5sZWFybihuZXcgTW92ZShbMiwgMC4xXSkpXG4gICAgICAubGVhcm4obmV3IEtleU1vdmUoKSlcbiAgICAgIC5sZWFybihuZXcgUGxhY2UoKSlcbiAgICAgIC5sZWFybihuZXcgS2V5UGxhY2UoKSlcbiAgICAgIC5sZWFybihuZXcgQ2FtZXJhKDEpKVxuICAgICAgLmxlYXJuKG5ldyBDYXJyeSgzKSlcbiAgICAgIC5sZWFybihuZXcgRmlyZShbMywgM10pKVxuICAgICAgLmxlYXJuKG5ldyBLZXlGaXJlKCkpXG4gIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICd5b3UnXG4gIH1cblxuICB0aWNrIChkZWx0YSkge1xuICAgIE9iamVjdC52YWx1ZXModGhpcy50aWNrQWJpbGl0aWVzKS5mb3JFYWNoKGFiaWxpdHkgPT4gYWJpbGl0eS50aWNrKGRlbHRhLCB0aGlzKSlcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBDYXRcbiIsImltcG9ydCBUZXh0dXJlIGZyb20gJy4uL2xpYi9UZXh0dXJlJ1xuaW1wb3J0IEdhbWVPYmplY3QgZnJvbSAnLi9HYW1lT2JqZWN0J1xuXG5pbXBvcnQgeyBTVEFZLCBBQklMSVRZX09QRVJBVEUgfSBmcm9tICcuLi9jb25maWcvY29uc3RhbnRzJ1xuXG5jbGFzcyBEb29yIGV4dGVuZHMgR2FtZU9iamVjdCB7XG4gIGNvbnN0cnVjdG9yIChtYXApIHtcbiAgICAvLyBDcmVhdGUgdGhlIGNhdCBzcHJpdGVcbiAgICBzdXBlcihUZXh0dXJlLkRvb3IpXG5cbiAgICB0aGlzLm1hcCA9IG1hcFswXVxuICAgIHRoaXMudG9Qb3NpdGlvbiA9IG1hcFsxXVxuXG4gICAgdGhpcy5vbignY29sbGlkZScsIHRoaXMuYWN0aW9uV2l0aC5iaW5kKHRoaXMpKVxuICB9XG5cbiAgZ2V0IHR5cGUgKCkgeyByZXR1cm4gU1RBWSB9XG5cbiAgYWN0aW9uV2l0aCAob3BlcmF0b3IpIHtcbiAgICBsZXQgYWJpbGl0eSA9IG9wZXJhdG9yW0FCSUxJVFlfT1BFUkFURV1cbiAgICBpZiAoYWJpbGl0eSkge1xuICAgICAgYWJpbGl0eSh0aGlzKVxuICAgIH0gZWxzZSB7XG4gICAgICBvcGVyYXRvci5lbWl0KCdjb2xsaWRlJywgdGhpcylcbiAgICB9XG4gIH1cblxuICBbQUJJTElUWV9PUEVSQVRFXSAoKSB7XG4gICAgdGhpcy5zYXkoWydHZXQgaW4gJywgdGhpcy5tYXAsICcgbm93LiddLmpvaW4oJycpKVxuICAgIHRoaXMuZW1pdCgndXNlJylcbiAgfVxuXG4gIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ0Rvb3InXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgRG9vclxuIiwiaW1wb3J0IHsgU3ByaXRlIH0gZnJvbSAnLi4vbGliL1BJWEknXG5pbXBvcnQgeyBTVEFUSUMgfSBmcm9tICcuLi9jb25maWcvY29uc3RhbnRzJ1xuaW1wb3J0IG1lc3NhZ2VzIGZyb20gJy4uL2xpYi9NZXNzYWdlcydcblxuY2xhc3MgR2FtZU9iamVjdCBleHRlbmRzIFNwcml0ZSB7XG4gIGdldCB0eXBlICgpIHsgcmV0dXJuIFNUQVRJQyB9XG4gIHNheSAobXNnKSB7XG4gICAgbWVzc2FnZXMuYWRkKG1zZylcbiAgICBjb25zb2xlLmxvZyhtc2cpXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgR2FtZU9iamVjdFxuIiwiaW1wb3J0IFRleHR1cmUgZnJvbSAnLi4vbGliL1RleHR1cmUnXG5pbXBvcnQgR2FtZU9iamVjdCBmcm9tICcuL0dhbWVPYmplY3QnXG5cbmltcG9ydCB7IFNUQVRJQyB9IGZyb20gJy4uL2NvbmZpZy9jb25zdGFudHMnXG5cbmNsYXNzIEdyYXNzIGV4dGVuZHMgR2FtZU9iamVjdCB7XG4gIGNvbnN0cnVjdG9yICgpIHtcbiAgICAvLyBDcmVhdGUgdGhlIGNhdCBzcHJpdGVcbiAgICBzdXBlcihUZXh0dXJlLkdyYXNzKVxuICB9XG5cbiAgZ2V0IHR5cGUgKCkgeyByZXR1cm4gU1RBVElDIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgR3Jhc3NcbiIsImltcG9ydCBUZXh0dXJlIGZyb20gJy4uL2xpYi9UZXh0dXJlJ1xuaW1wb3J0IEdhbWVPYmplY3QgZnJvbSAnLi9HYW1lT2JqZWN0J1xuXG5pbXBvcnQgeyBTVEFUSUMgfSBmcm9tICcuLi9jb25maWcvY29uc3RhbnRzJ1xuXG5jbGFzcyBHcmFzc0RlY29yYXRlMSBleHRlbmRzIEdhbWVPYmplY3Qge1xuICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgc3VwZXIoVGV4dHVyZS5HcmFzc0RlY29yYXRlMSlcbiAgfVxuXG4gIGdldCB0eXBlICgpIHsgcmV0dXJuIFNUQVRJQyB9XG5cbiAgdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiAnR3Jhc3NEZWNvcmF0ZTEnXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgR3Jhc3NEZWNvcmF0ZTFcbiIsImltcG9ydCBUZXh0dXJlIGZyb20gJy4uL2xpYi9UZXh0dXJlJ1xuaW1wb3J0IEdhbWVPYmplY3QgZnJvbSAnLi9HYW1lT2JqZWN0J1xuXG5pbXBvcnQgeyBTVEFUSUMgfSBmcm9tICcuLi9jb25maWcvY29uc3RhbnRzJ1xuXG5jbGFzcyBHcm91bmQgZXh0ZW5kcyBHYW1lT2JqZWN0IHtcbiAgY29uc3RydWN0b3IgKCkge1xuICAgIC8vIENyZWF0ZSB0aGUgY2F0IHNwcml0ZVxuICAgIHN1cGVyKFRleHR1cmUuR3JvdW5kKVxuICB9XG5cbiAgZ2V0IHR5cGUgKCkgeyByZXR1cm4gU1RBVElDIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdHcm91bmQnXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgR3JvdW5kXG4iLCJpbXBvcnQgVGV4dHVyZSBmcm9tICcuLi9saWIvVGV4dHVyZSdcbmltcG9ydCBHYW1lT2JqZWN0IGZyb20gJy4vR2FtZU9iamVjdCdcblxuaW1wb3J0IHsgU1RBWSB9IGZyb20gJy4uL2NvbmZpZy9jb25zdGFudHMnXG5cbmNsYXNzIElyb25GZW5jZSBleHRlbmRzIEdhbWVPYmplY3Qge1xuICBjb25zdHJ1Y3RvciAodHJlYXN1cmVzKSB7XG4gICAgc3VwZXIoVGV4dHVyZS5Jcm9uRmVuY2UpXG4gIH1cblxuICBnZXQgdHlwZSAoKSB7IHJldHVybiBTVEFZIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgSXJvbkZlbmNlXG4iLCJpbXBvcnQgVGV4dHVyZSBmcm9tICcuLi9saWIvVGV4dHVyZSdcbmltcG9ydCBHYW1lT2JqZWN0IGZyb20gJy4vR2FtZU9iamVjdCdcblxuaW1wb3J0IHsgU1RBWSB9IGZyb20gJy4uL2NvbmZpZy9jb25zdGFudHMnXG5cbmNsYXNzIFJvb3QgZXh0ZW5kcyBHYW1lT2JqZWN0IHtcbiAgY29uc3RydWN0b3IgKHRyZWFzdXJlcykge1xuICAgIC8vIENyZWF0ZSB0aGUgY2F0IHNwcml0ZVxuICAgIHN1cGVyKFRleHR1cmUuUm9vdClcbiAgfVxuXG4gIGdldCB0eXBlICgpIHsgcmV0dXJuIFNUQVkgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBSb290XG4iLCJpbXBvcnQgVGV4dHVyZSBmcm9tICcuLi9saWIvVGV4dHVyZSdcbmltcG9ydCBMaWdodCBmcm9tICcuLi9saWIvTGlnaHQnXG5pbXBvcnQgR2FtZU9iamVjdCBmcm9tICcuL0dhbWVPYmplY3QnXG5cbmltcG9ydCB7IFNUQVRJQyB9IGZyb20gJy4uL2NvbmZpZy9jb25zdGFudHMnXG5cbmNsYXNzIFRvcmNoIGV4dGVuZHMgR2FtZU9iamVjdCB7XG4gIGNvbnN0cnVjdG9yICgpIHtcbiAgICBzdXBlcihUZXh0dXJlLlRvcmNoKVxuXG4gICAgbGV0IHJhZGl1cyA9IDJcblxuICAgIHRoaXMub24oJ2FkZGVkJywgTGlnaHQubGlnaHRPbi5iaW5kKG51bGwsIHRoaXMsIHJhZGl1cywgMC45NSkpXG4gICAgdGhpcy5vbigncmVtb3ZlZWQnLCBMaWdodC5saWdodE9mZi5iaW5kKG51bGwsIHRoaXMpKVxuICB9XG5cbiAgZ2V0IHR5cGUgKCkgeyByZXR1cm4gU1RBVElDIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICd0b3JjaCdcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBUb3JjaFxuIiwiaW1wb3J0IFRleHR1cmUgZnJvbSAnLi4vbGliL1RleHR1cmUnXG5pbXBvcnQgR2FtZU9iamVjdCBmcm9tICcuL0dhbWVPYmplY3QnXG5cbmltcG9ydCB7IFJFUExZLCBBQklMSVRZX0NBUlJZIH0gZnJvbSAnLi4vY29uZmlnL2NvbnN0YW50cydcbmltcG9ydCB7IGluc3RhbmNlQnlJdGVtSWQgfSBmcm9tICcuLi9saWIvdXRpbHMnXG5cbmNsYXNzIFNsb3Qge1xuICBjb25zdHJ1Y3RvciAoW2l0ZW1JZCwgcGFyYW1zLCBjb3VudF0pIHtcbiAgICB0aGlzLml0ZW0gPSBpbnN0YW5jZUJ5SXRlbUlkKGl0ZW1JZCwgcGFyYW1zKVxuICAgIHRoaXMuY291bnQgPSBjb3VudFxuICB9XG5cbiAgdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiBbdGhpcy5pdGVtLnRvU3RyaW5nKCksICcoJywgdGhpcy5jb3VudCwgJyknXS5qb2luKCcnKVxuICB9XG59XG5cbmNsYXNzIFRyZWFzdXJlIGV4dGVuZHMgR2FtZU9iamVjdCB7XG4gIGNvbnN0cnVjdG9yIChpbnZlbnRvcmllcyA9IFtdKSB7XG4gICAgLy8gQ3JlYXRlIHRoZSBjYXQgc3ByaXRlXG4gICAgc3VwZXIoVGV4dHVyZS5UcmVhc3VyZSlcblxuICAgIHRoaXMuaW52ZW50b3JpZXMgPSBpbnZlbnRvcmllcy5tYXAodHJlYXN1cmUgPT4gbmV3IFNsb3QodHJlYXN1cmUpKVxuXG4gICAgdGhpcy5vbignY29sbGlkZScsIHRoaXMuYWN0aW9uV2l0aC5iaW5kKHRoaXMpKVxuICB9XG5cbiAgZ2V0IHR5cGUgKCkgeyByZXR1cm4gUkVQTFkgfVxuXG4gIGFjdGlvbldpdGggKG9wZXJhdG9yKSB7XG4gICAgbGV0IGNhcnJ5QWJpbGl0eSA9IG9wZXJhdG9yW0FCSUxJVFlfQ0FSUlldXG4gICAgaWYgKCFjYXJyeUFiaWxpdHkpIHtcbiAgICAgIG9wZXJhdG9yLnNheSgnSSBjYW5cXCd0IGNhcnJ5IGl0ZW1zIG5vdCB5ZXQuJylcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIHRoaXMuaW52ZW50b3JpZXMuZm9yRWFjaChcbiAgICAgIHRyZWFzdXJlID0+IGNhcnJ5QWJpbGl0eS50YWtlKHRyZWFzdXJlLml0ZW0sIHRyZWFzdXJlLmNvdW50KSlcbiAgICBvcGVyYXRvci5zYXkoWydJIHRha2VkICcsIHRoaXMudG9TdHJpbmcoKV0uam9pbignJykpXG5cbiAgICB0aGlzLnBhcmVudC5yZW1vdmVDaGlsZCh0aGlzKVxuICAgIHRoaXMuZGVzdHJveSgpXG4gIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgICd0cmVhc3VyZTogWycsXG4gICAgICB0aGlzLmludmVudG9yaWVzLmpvaW4oJywgJyksXG4gICAgICAnXSdcbiAgICBdLmpvaW4oJycpXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVHJlYXN1cmVcbiIsImltcG9ydCBUZXh0dXJlIGZyb20gJy4uL2xpYi9UZXh0dXJlJ1xuaW1wb3J0IEdhbWVPYmplY3QgZnJvbSAnLi9HYW1lT2JqZWN0J1xuXG5pbXBvcnQgeyBTVEFZIH0gZnJvbSAnLi4vY29uZmlnL2NvbnN0YW50cydcblxuY2xhc3MgVHJlZSBleHRlbmRzIEdhbWVPYmplY3Qge1xuICBjb25zdHJ1Y3RvciAoKSB7XG4gICAgc3VwZXIoVGV4dHVyZS5UcmVlKVxuICB9XG5cbiAgZ2V0IHR5cGUgKCkgeyByZXR1cm4gU1RBWSB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFRyZWVcbiIsImltcG9ydCBUZXh0dXJlIGZyb20gJy4uL2xpYi9UZXh0dXJlJ1xuaW1wb3J0IEdhbWVPYmplY3QgZnJvbSAnLi9HYW1lT2JqZWN0J1xuXG5pbXBvcnQgeyBTVEFZIH0gZnJvbSAnLi4vY29uZmlnL2NvbnN0YW50cydcblxuY2xhc3MgV2FsbCBleHRlbmRzIEdhbWVPYmplY3Qge1xuICBjb25zdHJ1Y3RvciAodHJlYXN1cmVzKSB7XG4gICAgLy8gQ3JlYXRlIHRoZSBjYXQgc3ByaXRlXG4gICAgc3VwZXIoVGV4dHVyZS5XYWxsKVxuXG4gICAgdGhpcy5vbignY29sbGlkZScsIHRoaXMuYWN0aW9uV2l0aC5iaW5kKHRoaXMpKVxuICB9XG5cbiAgZ2V0IHR5cGUgKCkgeyByZXR1cm4gU1RBWSB9XG5cbiAgYWN0aW9uV2l0aCAob3BlcmF0b3IpIHtcbiAgICBvcGVyYXRvci5lbWl0KCdjb2xsaWRlJywgdGhpcylcbiAgfVxuXG4gIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ1dhbGwnXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgV2FsbFxuIiwiY29uc3QgdHlwZSA9IFN5bWJvbCgnYWJpbGl0eScpXG5cbmNsYXNzIEFiaWxpdHkge1xuICBnZXQgdHlwZSAoKSB7IHJldHVybiB0eXBlIH1cblxuICBnZXRTYW1lVHlwZUFiaWxpdHkgKG93bmVyKSB7XG4gICAgcmV0dXJuIG93bmVyLmFiaWxpdGllc1t0aGlzLnR5cGVdXG4gIH1cblxuICAvLyDmmK/lkKbpnIDnva7mj5tcbiAgaGFzVG9SZXBsYWNlIChvd25lciwgYWJpbGl0eU5ldykge1xuICAgIGxldCBhYmlsaXR5T2xkID0gdGhpcy5nZXRTYW1lVHlwZUFiaWxpdHkob3duZXIpXG4gICAgcmV0dXJuICFhYmlsaXR5T2xkIHx8IGFiaWxpdHlOZXcuaXNCZXR0ZXIoYWJpbGl0eU9sZClcbiAgfVxuXG4gIC8vIOaWsOiIiuavlOi8g1xuICBpc0JldHRlciAob3RoZXIpIHtcbiAgICByZXR1cm4gdHJ1ZVxuICB9XG5cbiAgLy8g6YWN5YKZ5q2k5oqA6IO9XG4gIGNhcnJ5QnkgKG93bmVyKSB7XG4gICAgbGV0IGFiaWxpdHlPbGQgPSB0aGlzLmdldFNhbWVUeXBlQWJpbGl0eShvd25lcilcbiAgICBpZiAoYWJpbGl0eU9sZCkge1xuICAgICAgLy8gZmlyc3QgZ2V0IHRoaXMgdHlwZSBhYmlsaXR5XG4gICAgICBhYmlsaXR5T2xkLnJlcGxhY2VkQnkodGhpcywgb3duZXIpXG4gICAgfVxuICAgIG93bmVyLmFiaWxpdGllc1t0aGlzLnR5cGVdID0gdGhpc1xuICB9XG5cbiAgcmVwbGFjZWRCeSAob3RoZXIsIG93bmVyKSB7fVxuXG4gIGRyb3BCeSAob3duZXIpIHtcbiAgICBkZWxldGUgb3duZXIuYWJpbGl0aWVzW3RoaXMudHlwZV1cbiAgfVxuXG4gIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ3BseiBleHRlbmQgdGhpcyBjbGFzcydcbiAgfVxuXG4gIHNlcmlhbGl6ZSAoKSB7XG4gICAgcmV0dXJuIHt9XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgQWJpbGl0eVxuIiwiaW1wb3J0IEFiaWxpdHkgZnJvbSAnLi9BYmlsaXR5J1xuaW1wb3J0IExpZ2h0IGZyb20gJy4uLy4uL2xpYi9MaWdodCdcbmltcG9ydCB7IEFCSUxJVFlfQ0FNRVJBIH0gZnJvbSAnLi4vLi4vY29uZmlnL2NvbnN0YW50cydcblxuY2xhc3MgQ2FtZXJhIGV4dGVuZHMgQWJpbGl0eSB7XG4gIGNvbnN0cnVjdG9yICh2YWx1ZSkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLnJhZGl1cyA9IHZhbHVlXG4gIH1cblxuICBnZXQgdHlwZSAoKSB7IHJldHVybiBBQklMSVRZX0NBTUVSQSB9XG5cbiAgaXNCZXR0ZXIgKG90aGVyKSB7XG4gICAgLy8g5Y+q5pyD6K6K5aSnXG4gICAgcmV0dXJuIHRoaXMucmFkaXVzID49IG90aGVyLnJhZGl1c1xuICB9XG5cbiAgLy8g6YWN5YKZ5q2k5oqA6IO9XG4gIGNhcnJ5QnkgKG93bmVyKSB7XG4gICAgc3VwZXIuY2FycnlCeShvd25lcilcbiAgICBpZiAob3duZXIucGFyZW50KSB7XG4gICAgICB0aGlzLnNldHVwKG93bmVyLCBvd25lci5wYXJlbnQpXG4gICAgfSBlbHNlIHtcbiAgICAgIG93bmVyLm9uY2UoJ2FkZGVkJywgY29udGFpbmVyID0+IHRoaXMuc2V0dXAob3duZXIsIGNvbnRhaW5lcikpXG4gICAgfVxuICB9XG5cbiAgcmVwbGFjZWRCeSAob3RoZXIsIG93bmVyKSB7XG4gICAgdGhpcy5kcm9wQnkob3duZXIpXG4gIH1cblxuICBzZXR1cCAob3duZXIsIGNvbnRhaW5lcikge1xuICAgIExpZ2h0LmxpZ2h0T24ob3duZXIsIHRoaXMucmFkaXVzKVxuICAgIC8vIOWmguaenCBvd25lciDkuI3ooqvpoa/npLpcbiAgICBvd25lci5yZW1vdmVkID0gdGhpcy5vblJlbW92ZWQuYmluZCh0aGlzLCBvd25lcilcbiAgICBvd25lci5vbmNlKCdyZW1vdmVkJywgb3duZXIucmVtb3ZlZClcbiAgfVxuXG4gIG9uUmVtb3ZlZCAob3duZXIpIHtcbiAgICB0aGlzLmRyb3BCeShvd25lcilcbiAgICAvLyBvd25lciDph43mlrDooqvpoa/npLpcbiAgICBvd25lci5vbmNlKCdhZGRlZCcsIGNvbnRhaW5lciA9PiB0aGlzLnNldHVwKG93bmVyLCBjb250YWluZXIpKVxuICB9XG5cbiAgZHJvcEJ5IChvd25lcikge1xuICAgIExpZ2h0LmxpZ2h0T2ZmKG93bmVyKVxuICAgIC8vIHJlbW92ZSBsaXN0ZW5lclxuICAgIG93bmVyLm9mZigncmVtb3ZlZCcsIG93bmVyLnJlbW92ZWQpXG4gICAgZGVsZXRlIG93bmVyLnJlbW92ZWRcbiAgfVxuXG4gIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ2xpZ2h0IGFyZWE6ICcgKyB0aGlzLnJhZGl1c1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IENhbWVyYVxuIiwiaW1wb3J0IEFiaWxpdHkgZnJvbSAnLi9BYmlsaXR5J1xuaW1wb3J0IHsgQUJJTElUWV9DQVJSWSwgQUJJTElUWV9MRUFSTiB9IGZyb20gJy4uLy4uL2NvbmZpZy9jb25zdGFudHMnXG5cbmZ1bmN0aW9uIG5ld1Nsb3QgKGl0ZW0sIGNvdW50KSB7XG4gIHJldHVybiB7XG4gICAgaXRlbSxcbiAgICBjb3VudCxcbiAgICB0b1N0cmluZyAoKSB7XG4gICAgICByZXR1cm4gW2l0ZW0udG9TdHJpbmcoKSwgJygnLCB0aGlzLmNvdW50LCAnKSddLmpvaW4oJycpXG4gICAgfVxuICB9XG59XG5cbmNsYXNzIENhcnJ5IGV4dGVuZHMgQWJpbGl0eSB7XG4gIGNvbnN0cnVjdG9yIChpbml0U2xvdHMpIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5iYWdzID0gW11cbiAgICB0aGlzLmJhZ3MucHVzaChBcnJheShpbml0U2xvdHMpLmZpbGwoKSlcbiAgfVxuXG4gIGdldCB0eXBlICgpIHsgcmV0dXJuIEFCSUxJVFlfQ0FSUlkgfVxuXG4gIGNhcnJ5QnkgKG93bmVyKSB7XG4gICAgc3VwZXIuY2FycnlCeShvd25lcilcbiAgICB0aGlzLm93bmVyID0gb3duZXJcbiAgICBvd25lcltBQklMSVRZX0NBUlJZXSA9IHRoaXNcbiAgfVxuXG4gIHRha2UgKGl0ZW0sIGNvdW50ID0gMSkge1xuICAgIGxldCBvd25lciA9IHRoaXMub3duZXJcbiAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIEFiaWxpdHkgJiYgb3duZXJbQUJJTElUWV9MRUFSTl0pIHtcbiAgICAgIC8vIOWPluW+l+iDveWKm1xuICAgICAgb3duZXJbQUJJTElUWV9MRUFSTl0ubGVhcm4oaXRlbSlcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBsZXQga2V5ID0gaXRlbS50b1N0cmluZygpXG4gICAgbGV0IGZpcnN0RW1wdHlTbG90XG4gICAgbGV0IGZvdW5kID0gdGhpcy5iYWdzLnNvbWUoKGJhZywgYmkpID0+IHtcbiAgICAgIHJldHVybiBiYWcuc29tZSgoc2xvdCwgc2kpID0+IHtcbiAgICAgICAgLy8g56ys5LiA5YCL56m65qC8XG4gICAgICAgIGlmICghc2xvdCAmJiAhZmlyc3RFbXB0eVNsb3QpIHtcbiAgICAgICAgICBmaXJzdEVtcHR5U2xvdCA9IHtzaSwgYml9XG4gICAgICAgIH1cbiAgICAgICAgLy8g54mp5ZOB55aK5YqgKOWQjOmhnuWeiylcbiAgICAgICAgaWYgKHNsb3QgJiYgc2xvdC5pdGVtLnRvU3RyaW5nKCkgPT09IGtleSkge1xuICAgICAgICAgIHNsb3QuY291bnQgKz0gY291bnRcbiAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgfSlcbiAgICB9KVxuICAgIGlmICghZm91bmQpIHtcbiAgICAgIGlmICghZmlyc3RFbXB0eVNsb3QpIHtcbiAgICAgICAgLy8g5rKS5pyJ56m65qC85Y+v5pS+54mp5ZOBXG4gICAgICAgIG93bmVyLnNheSgnbm8gZW1wdHkgc2xvdCBmb3IgbmV3IGl0ZW0gZ290LicpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuICAgICAgdGhpcy5iYWdzW2ZpcnN0RW1wdHlTbG90LmJpXVtmaXJzdEVtcHR5U2xvdC5zaV0gPSBuZXdTbG90KGl0ZW0sIGNvdW50KVxuICAgIH1cbiAgICBvd25lci5lbWl0KCdpbnZlbnRvcnktbW9kaWZpZWQnLCBpdGVtKVxuICB9XG5cbiAgZ2V0U2xvdEl0ZW0gKHNsb3RJbngpIHtcbiAgICBsZXQgYmlcbiAgICBsZXQgc2lcbiAgICAvLyDnhafokZfljIXljIXliqDlhaXpoIbluo/mn6Xmib5cbiAgICBsZXQgZm91bmQgPSB0aGlzLmJhZ3MuZmluZCgoYmFnLCBiKSA9PiB7XG4gICAgICBiaSA9IGJcbiAgICAgIHJldHVybiBiYWcuZmluZCgoc2xvdCwgcykgPT4ge1xuICAgICAgICBzaSA9IHNcbiAgICAgICAgcmV0dXJuIHNsb3RJbngtLSA9PT0gMFxuICAgICAgfSlcbiAgICB9KVxuICAgIGxldCBpdGVtXG4gICAgaWYgKGZvdW5kKSB7XG4gICAgICBmb3VuZCA9IHRoaXMuYmFnc1tiaV1bc2ldXG4gICAgICBpdGVtID0gZm91bmQuaXRlbVxuICAgICAgLy8g5Y+W5Ye65b6M5rib5LiAXG4gICAgICBpZiAoLS1mb3VuZC5jb3VudCA9PT0gMCkge1xuICAgICAgICB0aGlzLmJhZ3NbYmldW3NpXSA9IHVuZGVmaW5lZFxuICAgICAgfVxuICAgICAgdGhpcy5vd25lci5lbWl0KCdpbnZlbnRvcnktbW9kaWZpZWQnLCBpdGVtKVxuICAgIH1cbiAgICByZXR1cm4gaXRlbVxuICB9XG5cbiAgZ2V0SXRlbUJ5VHlwZSAodHlwZSkge1xuICAgIGxldCBiaVxuICAgIGxldCBzaVxuICAgIGxldCBmb3VuZCA9IHRoaXMuYmFncy5maW5kKChiYWcsIGIpID0+IHtcbiAgICAgIGJpID0gYlxuICAgICAgcmV0dXJuIGJhZy5maW5kKChzbG90LCBzKSA9PiB7XG4gICAgICAgIHNpID0gc1xuICAgICAgICByZXR1cm4gc2xvdCAmJiBzbG90Lml0ZW0gaW5zdGFuY2VvZiB0eXBlXG4gICAgICB9KVxuICAgIH0pXG4gICAgbGV0IGl0ZW1cbiAgICBpZiAoZm91bmQpIHtcbiAgICAgIGZvdW5kID0gdGhpcy5iYWdzW2JpXVtzaV1cbiAgICAgIGl0ZW0gPSBmb3VuZC5pdGVtXG4gICAgICAvLyDlj5blh7rlvozmuJvkuIBcbiAgICAgIGlmICgtLWZvdW5kLmNvdW50ID09PSAwKSB7XG4gICAgICAgIHRoaXMuYmFnc1tiaV1bc2ldID0gdW5kZWZpbmVkXG4gICAgICB9XG4gICAgICB0aGlzLm93bmVyLmVtaXQoJ2ludmVudG9yeS1tb2RpZmllZCcsIGl0ZW0pXG4gICAgfVxuICAgIHJldHVybiBpdGVtXG4gIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuIFsnY2Fycnk6ICcsIHRoaXMuYmFncy5qb2luKCcsICcpXS5qb2luKCcnKVxuICB9XG5cbiAgLy8gVE9ETzogc2F2ZSBkYXRhXG4gIHNlcmlhbGl6ZSAoKSB7XG4gICAgcmV0dXJuIHRoaXMuYmFnc1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IENhcnJ5XG4iLCJpbXBvcnQgQWJpbGl0eSBmcm9tICcuL0FiaWxpdHknXG5pbXBvcnQgeyBBQklMSVRZX0ZJUkUsIEFCSUxJVFlfQ0FSUlkgfSBmcm9tICcuLi8uLi9jb25maWcvY29uc3RhbnRzJ1xuaW1wb3J0IEJ1bGxldCBmcm9tICcuLi9CdWxsZXQnXG5cbmNvbnN0IE1PVVNFTU9WRSA9IFN5bWJvbCgnbW91c2Vtb3ZlJylcblxuY2xhc3MgRmlyZSBleHRlbmRzIEFiaWxpdHkge1xuICBjb25zdHJ1Y3RvciAoWyBzcGVlZCwgcG93ZXIgXSkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLnNwZWVkID0gc3BlZWRcbiAgICAvLyBUT0RPOiBpbXBsZW1lbnRcbiAgICB0aGlzLnBvd2VyID0gcG93ZXJcbiAgfVxuXG4gIGdldCB0eXBlICgpIHsgcmV0dXJuIEFCSUxJVFlfRklSRSB9XG5cbiAgY2FycnlCeSAob3duZXIpIHtcbiAgICBzdXBlci5jYXJyeUJ5KG93bmVyKVxuICAgIHRoaXMub3duZXIgPSBvd25lclxuICAgIG93bmVyW0FCSUxJVFlfRklSRV0gPSB0aGlzXG4gICAgb3duZXIuaW50ZXJhY3RpdmUgPSB0cnVlXG4gICAgb3duZXJbTU9VU0VNT1ZFXSA9IGUgPT4ge1xuICAgICAgdGhpcy50YXJnZXRQb3NpdGlvbiA9IGUuZGF0YS5nZXRMb2NhbFBvc2l0aW9uKG93bmVyKVxuICAgIH1cbiAgICBvd25lci5vbignbW91c2Vtb3ZlJywgb3duZXJbTU9VU0VNT1ZFXSlcbiAgfVxuXG4gIGZpcmUgKCkge1xuICAgIGxldCBvd25lciA9IHRoaXMub3duZXJcbiAgICBsZXQgc2NhbGUgPSBvd25lci5zY2FsZS54XG5cbiAgICBsZXQgY2FycnlBYmlsaXR5ID0gb3duZXJbQUJJTElUWV9DQVJSWV1cbiAgICBsZXQgQnVsbGV0VHlwZSA9IGNhcnJ5QWJpbGl0eS5nZXRJdGVtQnlUeXBlKEJ1bGxldClcbiAgICBpZiAoIUJ1bGxldFR5cGUpIHtcbiAgICAgIC8vIG5vIG1vcmUgYnVsbGV0IGluIGludmVudG9yeVxuICAgICAgY29uc29sZS5sb2coJ25vIG1vcmUgYnVsbGV0IGluIGludmVudG9yeScpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgbGV0IGJ1bGxldCA9IG5ldyBCdWxsZXRUeXBlLmNvbnN0cnVjdG9yKHRoaXMuc3BlZWQpXG5cbiAgICBidWxsZXQucG9zaXRpb24uc2V0KG93bmVyLnggKyBvd25lci53aWR0aCAvIDIsIG93bmVyLnkgKyBvd25lci5oZWlnaHQgLyAyKVxuICAgIGJ1bGxldC5zY2FsZS5zZXQoc2NhbGUsIHNjYWxlKVxuICAgIGJ1bGxldC5zZXREaXJlY3Rpb24odGhpcy50YXJnZXRQb3NpdGlvbilcblxuICAgIG93bmVyLmVtaXQoJ2ZpcmUnLCBidWxsZXQpXG4gIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdwbGFjZSdcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBGaXJlXG4iLCIvKiBnbG9iYWwgYWRkRXZlbnRMaXN0ZW5lciwgcmVtb3ZlRXZlbnRMaXN0ZW5lciAqL1xuaW1wb3J0IEFiaWxpdHkgZnJvbSAnLi9BYmlsaXR5J1xuaW1wb3J0IHsgQUJJTElUWV9GSVJFLCBBQklMSVRZX0tFWV9GSVJFIH0gZnJvbSAnLi4vLi4vY29uZmlnL2NvbnN0YW50cydcblxuY2xhc3MgS2V5RmlyZSBleHRlbmRzIEFiaWxpdHkge1xuICBnZXQgdHlwZSAoKSB7IHJldHVybiBBQklMSVRZX0tFWV9GSVJFIH1cblxuICBpc0JldHRlciAob3RoZXIpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8vIOmFjeWCmeatpOaKgOiDvVxuICBjYXJyeUJ5IChvd25lcikge1xuICAgIHN1cGVyLmNhcnJ5Qnkob3duZXIpXG4gICAgdGhpcy5zZXR1cChvd25lcilcbiAgfVxuXG4gIHNldHVwIChvd25lcikge1xuICAgIGxldCBmaXJlQWJpbGl0eSA9IG93bmVyW0FCSUxJVFlfRklSRV1cbiAgICBsZXQgYmluZCA9ICgpID0+IHtcbiAgICAgIGxldCBoYW5kbGVyID0gZSA9PiB7XG4gICAgICAgIGZpcmVBYmlsaXR5LmZpcmUoKVxuICAgICAgfVxuICAgICAgYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBoYW5kbGVyKVxuICAgICAgcmV0dXJuIGhhbmRsZXJcbiAgICB9XG5cbiAgICBvd25lcltBQklMSVRZX0tFWV9GSVJFXSA9IGJpbmQoKVxuICB9XG5cbiAgZHJvcEJ5IChvd25lcikge1xuICAgIHN1cGVyLmRyb3BCeShvd25lcilcbiAgICByZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIG93bmVyW0FCSUxJVFlfS0VZX0ZJUkVdKVxuICAgIGRlbGV0ZSBvd25lcltBQklMSVRZX0tFWV9GSVJFXVxuICB9XG5cbiAgdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiAna2V5IGZpcmUnXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgS2V5RmlyZVxuIiwiaW1wb3J0IEFiaWxpdHkgZnJvbSAnLi9BYmlsaXR5J1xuaW1wb3J0IGtleWJvYXJkSlMgZnJvbSAna2V5Ym9hcmRqcydcbmltcG9ydCB7IExFRlQsIFVQLCBSSUdIVCwgRE9XTiB9IGZyb20gJy4uLy4uL2NvbmZpZy9jb250cm9sJ1xuaW1wb3J0IHsgQUJJTElUWV9NT1ZFLCBBQklMSVRZX0tFWV9NT1ZFIH0gZnJvbSAnLi4vLi4vY29uZmlnL2NvbnN0YW50cydcblxuY2xhc3MgS2V5TW92ZSBleHRlbmRzIEFiaWxpdHkge1xuICBnZXQgdHlwZSAoKSB7IHJldHVybiBBQklMSVRZX0tFWV9NT1ZFIH1cblxuICBpc0JldHRlciAob3RoZXIpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIC8vIOmFjeWCmeatpOaKgOiDvVxuICBjYXJyeUJ5IChvd25lcikge1xuICAgIHN1cGVyLmNhcnJ5Qnkob3duZXIpXG4gICAgdGhpcy5zZXR1cChvd25lcilcbiAgfVxuXG4gIHNldHVwIChvd25lcikge1xuICAgIGxldCBkaXIgPSB7fVxuICAgIGxldCBjYWxjRGlyID0gKCkgPT4ge1xuICAgICAgb3duZXJbQUJJTElUWV9NT1ZFXS5zZXREaXJlY3Rpb24oe1xuICAgICAgICB4OiAtZGlyW0xFRlRdICsgZGlyW1JJR0hUXSxcbiAgICAgICAgeTogLWRpcltVUF0gKyBkaXJbRE9XTl1cbiAgICAgIH0pXG4gICAgfVxuICAgIGxldCBiaW5kID0gY29kZSA9PiB7XG4gICAgICBkaXJbY29kZV0gPSAwXG4gICAgICBsZXQgcHJlSGFuZGxlciA9IGUgPT4ge1xuICAgICAgICBlLnByZXZlbnRSZXBlYXQoKVxuICAgICAgICBkaXJbY29kZV0gPSAxXG4gICAgICAgIG93bmVyW0FCSUxJVFlfTU9WRV0uY2xlYXJQYXRoKClcbiAgICAgIH1cbiAgICAgIGtleWJvYXJkSlMuYmluZChjb2RlLCBwcmVIYW5kbGVyLCAoKSA9PiB7XG4gICAgICAgIGRpcltjb2RlXSA9IDBcbiAgICAgIH0pXG4gICAgICByZXR1cm4gcHJlSGFuZGxlclxuICAgIH1cblxuICAgIGtleWJvYXJkSlMuc2V0Q29udGV4dCgnJylcbiAgICBrZXlib2FyZEpTLndpdGhDb250ZXh0KCcnLCAoKSA9PiB7XG4gICAgICBvd25lcltBQklMSVRZX0tFWV9NT1ZFXSA9IHtcbiAgICAgICAgW0xFRlRdOiBiaW5kKExFRlQpLFxuICAgICAgICBbVVBdOiBiaW5kKFVQKSxcbiAgICAgICAgW1JJR0hUXTogYmluZChSSUdIVCksXG4gICAgICAgIFtET1dOXTogYmluZChET1dOKVxuICAgICAgfVxuICAgIH0pXG5cbiAgICB0aGlzLnRpbWVyID0gc2V0SW50ZXJ2YWwoY2FsY0RpciwgMTcpXG4gIH1cblxuICBkcm9wQnkgKG93bmVyKSB7XG4gICAgc3VwZXIuZHJvcEJ5KG93bmVyKVxuICAgIGtleWJvYXJkSlMud2l0aENvbnRleHQoJycsICgpID0+IHtcbiAgICAgIE9iamVjdC5lbnRyaWVzKG93bmVyW0FCSUxJVFlfS0VZX01PVkVdKS5mb3JFYWNoKChba2V5LCBoYW5kbGVyXSkgPT4ge1xuICAgICAgICBrZXlib2FyZEpTLnVuYmluZChrZXksIGhhbmRsZXIpXG4gICAgICB9KVxuICAgIH0pXG4gICAgZGVsZXRlIG93bmVyW0FCSUxJVFlfS0VZX01PVkVdXG5cbiAgICBjbGVhckludGVydmFsKHRoaXMudGltZXIpXG4gIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdrZXkgY29udHJvbCdcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBLZXlNb3ZlXG4iLCJpbXBvcnQgQWJpbGl0eSBmcm9tICcuL0FiaWxpdHknXG5pbXBvcnQga2V5Ym9hcmRKUyBmcm9tICdrZXlib2FyZGpzJ1xuaW1wb3J0IHsgUExBQ0UxLCBQTEFDRTIsIFBMQUNFMywgUExBQ0U0IH0gZnJvbSAnLi4vLi4vY29uZmlnL2NvbnRyb2wnXG5pbXBvcnQgeyBBQklMSVRZX1BMQUNFLCBBQklMSVRZX0tFWV9QTEFDRSB9IGZyb20gJy4uLy4uL2NvbmZpZy9jb25zdGFudHMnXG5cbmNvbnN0IFNMT1RTID0gW1xuICBQTEFDRTEsIFBMQUNFMiwgUExBQ0UzLCBQTEFDRTRcbl1cblxuY2xhc3MgS2V5UGxhY2UgZXh0ZW5kcyBBYmlsaXR5IHtcbiAgZ2V0IHR5cGUgKCkgeyByZXR1cm4gQUJJTElUWV9LRVlfUExBQ0UgfVxuXG4gIGlzQmV0dGVyIChvdGhlcikge1xuICAgIHJldHVybiBmYWxzZVxuICB9XG5cbiAgLy8g6YWN5YKZ5q2k5oqA6IO9XG4gIGNhcnJ5QnkgKG93bmVyKSB7XG4gICAgc3VwZXIuY2FycnlCeShvd25lcilcbiAgICB0aGlzLnNldHVwKG93bmVyKVxuICB9XG5cbiAgc2V0dXAgKG93bmVyKSB7XG4gICAgbGV0IHBsYWNlQWJpbGl0eSA9IG93bmVyW0FCSUxJVFlfUExBQ0VdXG4gICAgbGV0IGJpbmQgPSBrZXkgPT4ge1xuICAgICAgbGV0IHNsb3RJbnggPSBTTE9UUy5pbmRleE9mKGtleSlcbiAgICAgIGxldCBoYW5kbGVyID0gZSA9PiB7XG4gICAgICAgIGUucHJldmVudFJlcGVhdCgpXG4gICAgICAgIHBsYWNlQWJpbGl0eS5wbGFjZShzbG90SW54KVxuICAgICAgfVxuICAgICAga2V5Ym9hcmRKUy5iaW5kKGtleSwgaGFuZGxlciwgKCkgPT4ge30pXG4gICAgICByZXR1cm4gaGFuZGxlclxuICAgIH1cblxuICAgIGtleWJvYXJkSlMuc2V0Q29udGV4dCgnJylcbiAgICBrZXlib2FyZEpTLndpdGhDb250ZXh0KCcnLCAoKSA9PiB7XG4gICAgICBvd25lcltBQklMSVRZX0tFWV9QTEFDRV0gPSB7XG4gICAgICAgIFBMQUNFMTogYmluZChQTEFDRTEpLFxuICAgICAgICBQTEFDRTI6IGJpbmQoUExBQ0UyKSxcbiAgICAgICAgUExBQ0UzOiBiaW5kKFBMQUNFMyksXG4gICAgICAgIFBMQUNFNDogYmluZChQTEFDRTQpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGRyb3BCeSAob3duZXIpIHtcbiAgICBzdXBlci5kcm9wQnkob3duZXIpXG4gICAga2V5Ym9hcmRKUy53aXRoQ29udGV4dCgnJywgKCkgPT4ge1xuICAgICAgT2JqZWN0LmVudHJpZXMob3duZXJbQUJJTElUWV9LRVlfUExBQ0VdKS5mb3JFYWNoKChba2V5LCBoYW5kbGVyXSkgPT4ge1xuICAgICAgICBrZXlib2FyZEpTLnVuYmluZChrZXksIGhhbmRsZXIpXG4gICAgICB9KVxuICAgIH0pXG4gICAgZGVsZXRlIG93bmVyW0FCSUxJVFlfS0VZX1BMQUNFXVxuICB9XG5cbiAgdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiAna2V5IHBsYWNlJ1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IEtleVBsYWNlXG4iLCJpbXBvcnQgQWJpbGl0eSBmcm9tICcuL0FiaWxpdHknXG5pbXBvcnQgeyBBQklMSVRZX0xFQVJOIH0gZnJvbSAnLi4vLi4vY29uZmlnL2NvbnN0YW50cydcblxuY2xhc3MgTGVhcm4gZXh0ZW5kcyBBYmlsaXR5IHtcbiAgZ2V0IHR5cGUgKCkgeyByZXR1cm4gQUJJTElUWV9MRUFSTiB9XG5cbiAgaXNCZXR0ZXIgKG90aGVyKSB7XG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICBjYXJyeUJ5IChvd25lcikge1xuICAgIGlmICghb3duZXIuYWJpbGl0aWVzKSB7XG4gICAgICBvd25lci5hYmlsaXRpZXMgPSB7fVxuICAgICAgb3duZXIudGlja0FiaWxpdGllcyA9IHt9XG4gICAgfVxuICAgIHN1cGVyLmNhcnJ5Qnkob3duZXIpXG4gICAgdGhpcy5vd25lciA9IG93bmVyXG4gICAgb3duZXJbQUJJTElUWV9MRUFSTl0gPSB0aGlzXG4gICAgcmV0dXJuIHRoaXNcbiAgfVxuXG4gIGxlYXJuIChhYmlsaXR5KSB7XG4gICAgbGV0IG93bmVyID0gdGhpcy5vd25lclxuICAgIGlmIChhYmlsaXR5Lmhhc1RvUmVwbGFjZShvd25lciwgYWJpbGl0eSkpIHtcbiAgICAgIGFiaWxpdHkuY2FycnlCeShvd25lcilcbiAgICAgIG93bmVyLmVtaXQoJ2FiaWxpdHktY2FycnknLCBhYmlsaXR5KVxuICAgIH1cbiAgICByZXR1cm4gb3duZXJbQUJJTElUWV9MRUFSTl1cbiAgfVxuXG4gIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ2xlYXJuaW5nJ1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IExlYXJuXG4iLCJpbXBvcnQgQWJpbGl0eSBmcm9tICcuL0FiaWxpdHknXG5pbXBvcnQgeyBBQklMSVRZX01PVkUgfSBmcm9tICcuLi8uLi9jb25maWcvY29uc3RhbnRzJ1xuaW1wb3J0IFZlY3RvciBmcm9tICcuLi8uLi9saWIvVmVjdG9yJ1xuXG5jb25zdCBESVNUQU5DRV9USFJFU0hPTEQgPSAxXG5cbmNsYXNzIE1vdmUgZXh0ZW5kcyBBYmlsaXR5IHtcbiAgLyoqXG4gICAqIOenu+WLleiDveWKm1xuICAgKiBAcGFyYW0gIHtpbnR9IHZhbHVlICAgIOenu+WLlemAn+W6plxuICAgKiBAcGFyYW0gIHtOdW1iZXJ9IGZyaWN0aW9uIOaRqeaTpuWKmygxOiDmnIDlpKfvvIwwOiDmnIDlsI8pXG4gICAqL1xuICBjb25zdHJ1Y3RvciAoW3ZhbHVlLCBmcmljdGlvbl0pIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy52YWx1ZSA9IHZhbHVlXG4gICAgdGhpcy52ZWN0b3IgPSBuZXcgVmVjdG9yKDAsIDApXG4gICAgdGhpcy5mcmljdGlvbiA9IGZyaWN0aW9uXG4gICAgdGhpcy5wYXRoID0gW11cbiAgICB0aGlzLm1vdmluZ1RvUG9pbnQgPSB1bmRlZmluZWRcbiAgICB0aGlzLmRpc3RhbmNlVGhyZXNob2xkID0gdGhpcy52YWx1ZSAqIERJU1RBTkNFX1RIUkVTSE9MRFxuICB9XG5cbiAgZ2V0IHR5cGUgKCkgeyByZXR1cm4gQUJJTElUWV9NT1ZFIH1cblxuICBpc0JldHRlciAob3RoZXIpIHtcbiAgICAvLyDlj6rmnIPliqDlv6tcbiAgICByZXR1cm4gdGhpcy52YWx1ZSA+IG90aGVyLnZhbHVlXG4gIH1cblxuICAvLyDphY3lgpnmraTmioDog71cbiAgY2FycnlCeSAob3duZXIpIHtcbiAgICBzdXBlci5jYXJyeUJ5KG93bmVyKVxuICAgIHRoaXMub3duZXIgPSBvd25lclxuICAgIG93bmVyW0FCSUxJVFlfTU9WRV0gPSB0aGlzXG4gICAgb3duZXIudGlja0FiaWxpdGllc1t0aGlzLnR5cGUudG9TdHJpbmcoKV0gPSB0aGlzXG4gIH1cblxuICByZXBsYWNlZEJ5IChvdGhlciwgb3duZXIpIHtcbiAgICBvdGhlci52ZWN0b3IgPSB0aGlzLnZlY3RvclxuICAgIG90aGVyLnBhdGggPSB0aGlzLnBhdGhcbiAgICBvdGhlci5tb3ZpbmdUb1BvaW50ID0gdGhpcy5tb3ZpbmdUb1BvaW50XG4gIH1cblxuICAvLyBAcG9pbnQg55u45bCN5pa8IG93bmVyIOeahOm7nlxuICBzZXREaXJlY3Rpb24gKHBvaW50KSB7XG4gICAgbGV0IHZlY3RvciA9IFZlY3Rvci5mcm9tUG9pbnQocG9pbnQpXG4gICAgbGV0IGxlbiA9IHZlY3Rvci5sZW5ndGhcbiAgICBpZiAobGVuID09PSAwKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgdGhpcy52ZWN0b3IgPSB2ZWN0b3Iuc2V0TGVuZ3RoKHRoaXMudmFsdWUpXG4gIH1cblxuICAvLyDnp7vli5XliLDpu55cbiAgbW92ZVRvIChwb2ludCkge1xuICAgIHRoaXMuc2V0RGlyZWN0aW9uKHtcbiAgICAgIHg6IHBvaW50LnggLSB0aGlzLm93bmVyLngsXG4gICAgICB5OiBwb2ludC55IC0gdGhpcy5vd25lci55XG4gICAgfSlcbiAgfVxuXG4gIC8vIOioreWumuenu+WLlei3r+W+kVxuICBzZXRQYXRoIChwYXRoKSB7XG4gICAgaWYgKHBhdGgubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyDmirXpgZTntYLpu55cbiAgICAgIHRoaXMubW92aW5nVG9Qb2ludCA9IHVuZGVmaW5lZFxuICAgICAgdGhpcy52ZWN0b3IgPSBuZXcgVmVjdG9yKDAsIDApXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgdGhpcy5wYXRoID0gcGF0aFxuICAgIHRoaXMubW92aW5nVG9Qb2ludCA9IHBhdGgucG9wKClcbiAgICB0aGlzLm1vdmVUbyh0aGlzLm1vdmluZ1RvUG9pbnQpXG4gIH1cblxuICBjbGVhclBhdGggKCkge1xuICAgIHRoaXMubW92aW5nVG9Qb2ludCA9IHVuZGVmaW5lZFxuICAgIHRoaXMucGF0aCA9IFtdXG4gIH1cblxuICBhZGRQYXRoIChwYXRoKSB7XG4gICAgdGhpcy5zZXRQYXRoKHBhdGguY29uY2F0KHRoaXMucGF0aCkpXG4gIH1cblxuICAvLyB0aWNrXG4gIHRpY2sgKGRlbHRhLCBvd25lcikge1xuICAgIC8vIE5PVElDRTog5YGH6Kit6Ieq5bex5piv5q2j5pa55b2iXG4gICAgbGV0IHNjYWxlID0gb3duZXIuc2NhbGUueFxuICAgIGxldCB2ZWN0b3IgPSB0aGlzLnZlY3RvclxuICAgIGxldCBtYXhWYWx1ZSA9IHRoaXMudmFsdWVcblxuICAgIC8vIOS4jeWPr+i2heWHuuacgOmrmOmAn+W6plxuICAgIGlmICh0aGlzLnZlY3Rvci5sZW5ndGggPiBtYXhWYWx1ZSkge1xuICAgICAgdGhpcy52ZWN0b3Iuc2V0TGVuZ3RoKG1heFZhbHVlKVxuICAgIH1cblxuICAgIC8vIOaRqeaTpuWKm1xuICAgIHRoaXMudmVjdG9yLmFkZCh0aGlzLnZlY3Rvci5jbG9uZSgpLmludmVydCgpLm11bHRpcGx5U2NhbGFyKHRoaXMuZnJpY3Rpb24pKVxuXG4gICAgb3duZXIueCArPSB2ZWN0b3IueCAqIHRoaXMudmFsdWUgKiBzY2FsZSAqIGRlbHRhXG4gICAgb3duZXIueSArPSB2ZWN0b3IueSAqIHRoaXMudmFsdWUgKiBzY2FsZSAqIGRlbHRhXG5cbiAgICBpZiAodGhpcy5tb3ZpbmdUb1BvaW50KSB7XG4gICAgICBsZXQgcG9zaXRpb24gPSBvd25lci5wb3NpdGlvblxuICAgICAgbGV0IHRhcmdldFBvc2l0aW9uID0gdGhpcy5tb3ZpbmdUb1BvaW50XG4gICAgICBsZXQgYSA9IHBvc2l0aW9uLnggLSB0YXJnZXRQb3NpdGlvbi54XG4gICAgICBsZXQgYiA9IHBvc2l0aW9uLnkgLSB0YXJnZXRQb3NpdGlvbi55XG4gICAgICBsZXQgYyA9IE1hdGguc3FydChhICogYSArIGIgKiBiKVxuICAgICAgaWYgKGMgPCB0aGlzLmRpc3RhbmNlVGhyZXNob2xkKSB7XG4gICAgICAgIHRoaXMuc2V0UGF0aCh0aGlzLnBhdGgpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLm1vdmVUbyh0aGlzLm1vdmluZ1RvUG9pbnQpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiAnbW92ZSBsZXZlbDogJyArIHRoaXMudmFsdWVcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBNb3ZlXG4iLCJpbXBvcnQgQWJpbGl0eSBmcm9tICcuL0FiaWxpdHknXG5pbXBvcnQgeyBBQklMSVRZX09QRVJBVEUgfSBmcm9tICcuLi8uLi9jb25maWcvY29uc3RhbnRzJ1xuXG5jbGFzcyBPcGVyYXRlIGV4dGVuZHMgQWJpbGl0eSB7XG4gIGNvbnN0cnVjdG9yICh2YWx1ZSkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLnNldCA9IG5ldyBTZXQoW3ZhbHVlXSlcbiAgfVxuXG4gIGdldCB0eXBlICgpIHsgcmV0dXJuIEFCSUxJVFlfT1BFUkFURSB9XG5cbiAgY2FycnlCeSAob3duZXIpIHtcbiAgICBzdXBlci5jYXJyeUJ5KG93bmVyKVxuICAgIG93bmVyW0FCSUxJVFlfT1BFUkFURV0gPSB0aGlzW0FCSUxJVFlfT1BFUkFURV0uYmluZCh0aGlzLCBvd25lcilcbiAgICByZXR1cm4gb3duZXJbQUJJTElUWV9PUEVSQVRFXVxuICB9XG5cbiAgcmVwbGFjZWRCeSAob3RoZXIpIHtcbiAgICB0aGlzLnNldC5mb3JFYWNoKG90aGVyLnNldC5hZGQuYmluZChvdGhlci5zZXQpKVxuICB9XG5cbiAgW0FCSUxJVFlfT1BFUkFURV0gKG9wZXJhdG9yLCB0YXJnZXQpIHtcbiAgICBpZiAodGhpcy5zZXQuaGFzKHRhcmdldC5tYXApKSB7XG4gICAgICBvcGVyYXRvci5zYXkob3BlcmF0b3IudG9TdHJpbmcoKSArICcgdXNlIGFiaWxpdHkgdG8gb3BlbiAnICsgdGFyZ2V0Lm1hcClcbiAgICAgIHRhcmdldFt0aGlzLnR5cGVdKClcbiAgICB9XG4gIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuIFsna2V5czogJywgQXJyYXkuZnJvbSh0aGlzLnNldCkuam9pbignLCAnKV0uam9pbignJylcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBPcGVyYXRlXG4iLCJpbXBvcnQgQWJpbGl0eSBmcm9tICcuL0FiaWxpdHknXG5pbXBvcnQgeyBBQklMSVRZX1BMQUNFLCBBQklMSVRZX0NBUlJZIH0gZnJvbSAnLi4vLi4vY29uZmlnL2NvbnN0YW50cydcblxuY2xhc3MgUGxhY2UgZXh0ZW5kcyBBYmlsaXR5IHtcbiAgZ2V0IHR5cGUgKCkgeyByZXR1cm4gQUJJTElUWV9QTEFDRSB9XG5cbiAgY2FycnlCeSAob3duZXIpIHtcbiAgICBzdXBlci5jYXJyeUJ5KG93bmVyKVxuICAgIHRoaXMub3duZXIgPSBvd25lclxuICAgIG93bmVyW0FCSUxJVFlfUExBQ0VdID0gdGhpc1xuICB9XG5cbiAgcGxhY2UgKHNsb3RJbngpIHtcbiAgICBsZXQgb3duZXIgPSB0aGlzLm93bmVyXG4gICAgbGV0IGNhcnJ5QWJpbGl0eSA9IG93bmVyW0FCSUxJVFlfQ0FSUlldXG4gICAgbGV0IGl0ZW0gPSBjYXJyeUFiaWxpdHkuZ2V0U2xvdEl0ZW0oc2xvdElueClcbiAgICBpZiAoaXRlbSkge1xuICAgICAgb3duZXIuZW1pdCgncGxhY2UnLCBuZXcgaXRlbS5jb25zdHJ1Y3RvcigpKVxuXG4gICAgICBsZXQgcG9zaXRpb24gPSBvd25lci5wb3NpdGlvblxuICAgICAgb3duZXIuc2F5KFsncGxhY2UgJywgaXRlbS50b1N0cmluZygpLCAnIGF0ICcsXG4gICAgICAgIFsnKCcsIHBvc2l0aW9uLngudG9GaXhlZCgwKSwgJywgJywgcG9zaXRpb24ueS50b0ZpeGVkKDApLCAnKSddLmpvaW4oJycpXS5qb2luKCcnKSlcbiAgICB9XG4gIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdwbGFjZSdcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBQbGFjZVxuIiwiaW1wb3J0IHsgVGV4dCwgVGV4dFN0eWxlLCBsb2FkZXIgfSBmcm9tICcuLi9saWIvUElYSSdcbmltcG9ydCBTY2VuZSBmcm9tICcuLi9saWIvU2NlbmUnXG5pbXBvcnQgUGxheVNjZW5lIGZyb20gJy4vUGxheVNjZW5lJ1xuXG5sZXQgdGV4dCA9ICdsb2FkaW5nJ1xuXG5jbGFzcyBMb2FkaW5nU2NlbmUgZXh0ZW5kcyBTY2VuZSB7XG4gIGNvbnN0cnVjdG9yICgpIHtcbiAgICBzdXBlcigpXG5cbiAgICB0aGlzLmxpZmUgPSAwXG4gIH1cblxuICBjcmVhdGUgKCkge1xuICAgIGxldCBzdHlsZSA9IG5ldyBUZXh0U3R5bGUoe1xuICAgICAgZm9udEZhbWlseTogJ0FyaWFsJyxcbiAgICAgIGZvbnRTaXplOiAzNixcbiAgICAgIGZpbGw6ICd3aGl0ZScsXG4gICAgICBzdHJva2U6ICcjZmYzMzAwJyxcbiAgICAgIHN0cm9rZVRoaWNrbmVzczogNCxcbiAgICAgIGRyb3BTaGFkb3c6IHRydWUsXG4gICAgICBkcm9wU2hhZG93Q29sb3I6ICcjMDAwMDAwJyxcbiAgICAgIGRyb3BTaGFkb3dCbHVyOiA0LFxuICAgICAgZHJvcFNoYWRvd0FuZ2xlOiBNYXRoLlBJIC8gNixcbiAgICAgIGRyb3BTaGFkb3dEaXN0YW5jZTogNlxuICAgIH0pXG4gICAgdGhpcy50ZXh0TG9hZGluZyA9IG5ldyBUZXh0KHRleHQsIHN0eWxlKVxuXG4gICAgLy8gQWRkIHRoZSBjYXQgdG8gdGhlIHN0YWdlXG4gICAgdGhpcy5hZGRDaGlsZCh0aGlzLnRleHRMb2FkaW5nKVxuXG4gICAgLy8gbG9hZCBhbiBpbWFnZSBhbmQgcnVuIHRoZSBgc2V0dXBgIGZ1bmN0aW9uIHdoZW4gaXQncyBkb25lXG4gICAgbG9hZGVyXG4gICAgICAuYWRkKCdpbWFnZXMvdGVycmFpbl9hdGxhcy5qc29uJylcbiAgICAgIC5hZGQoJ2ltYWdlcy9iYXNlX291dF9hdGxhcy5qc29uJylcbiAgICAgIC5sb2FkKCgpID0+IHRoaXMuZW1pdCgnY2hhbmdlU2NlbmUnLCBQbGF5U2NlbmUsIHtcbiAgICAgICAgbWFwRmlsZTogJ0UwTjAnLFxuICAgICAgICBwb3NpdGlvbjogWzQsIDFdXG4gICAgICB9KSlcbiAgfVxuXG4gIHRpY2sgKGRlbHRhKSB7XG4gICAgdGhpcy5saWZlICs9IGRlbHRhIC8gMzAgLy8gYmxlbmQgc3BlZWRcbiAgICB0aGlzLnRleHRMb2FkaW5nLnRleHQgPSB0ZXh0ICsgQXJyYXkoTWF0aC5mbG9vcih0aGlzLmxpZmUpICUgNCArIDEpLmpvaW4oJy4nKVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IExvYWRpbmdTY2VuZVxuIiwiaW1wb3J0IHsgbG9hZGVyLCByZXNvdXJjZXMsIGRpc3BsYXkgfSBmcm9tICcuLi9saWIvUElYSSdcbmltcG9ydCBTY2VuZSBmcm9tICcuLi9saWIvU2NlbmUnXG5pbXBvcnQgTWFwIGZyb20gJy4uL2xpYi9NYXAnXG5pbXBvcnQgeyBJU19NT0JJTEUgfSBmcm9tICcuLi9jb25maWcvY29uc3RhbnRzJ1xuXG5pbXBvcnQgQ2F0IGZyb20gJy4uL29iamVjdHMvQ2F0J1xuXG5pbXBvcnQgTWVzc2FnZVdpbmRvdyBmcm9tICcuLi91aS9NZXNzYWdlV2luZG93J1xuaW1wb3J0IFBsYXllcldpbmRvdyBmcm9tICcuLi91aS9QbGF5ZXJXaW5kb3cnXG5pbXBvcnQgSW52ZW50b3J5V2luZG93IGZyb20gJy4uL3VpL0ludmVudG9yeVdpbmRvdydcbmltcG9ydCBUb3VjaERpcmVjdGlvbkNvbnRyb2xQYW5lbCBmcm9tICcuLi91aS9Ub3VjaERpcmVjdGlvbkNvbnRyb2xQYW5lbCdcbmltcG9ydCBUb3VjaE9wZXJhdGlvbkNvbnRyb2xQYW5lbCBmcm9tICcuLi91aS9Ub3VjaE9wZXJhdGlvbkNvbnRyb2xQYW5lbCdcblxubGV0IHNjZW5lV2lkdGhcbmxldCBzY2VuZUhlaWdodFxuXG5mdW5jdGlvbiBnZXRNZXNzYWdlV2luZG93T3B0ICgpIHtcbiAgbGV0IG9wdCA9IHt9XG4gIGlmIChJU19NT0JJTEUpIHtcbiAgICBvcHQud2lkdGggPSBzY2VuZVdpZHRoXG4gICAgb3B0LmZvbnRTaXplID0gb3B0LndpZHRoIC8gMzBcbiAgICBvcHQuc2Nyb2xsQmFyV2lkdGggPSA1MFxuICAgIG9wdC5zY3JvbGxCYXJNaW5IZWlnaHQgPSA3MFxuICB9IGVsc2Uge1xuICAgIG9wdC53aWR0aCA9IHNjZW5lV2lkdGggPCA0MDAgPyBzY2VuZVdpZHRoIDogc2NlbmVXaWR0aCAvIDJcbiAgICBvcHQuZm9udFNpemUgPSBvcHQud2lkdGggLyA2MFxuICB9XG4gIG9wdC5oZWlnaHQgPSBzY2VuZUhlaWdodCAvIDZcbiAgb3B0LnggPSAwXG4gIG9wdC55ID0gc2NlbmVIZWlnaHQgLSBvcHQuaGVpZ2h0XG5cbiAgcmV0dXJuIG9wdFxufVxuXG5mdW5jdGlvbiBnZXRQbGF5ZXJXaW5kb3dPcHQgKHBsYXllcikge1xuICBsZXQgb3B0ID0ge1xuICAgIHBsYXllclxuICB9XG4gIG9wdC54ID0gMFxuICBvcHQueSA9IDBcbiAgaWYgKElTX01PQklMRSkge1xuICAgIG9wdC53aWR0aCA9IHNjZW5lV2lkdGggLyA0XG4gICAgb3B0LmhlaWdodCA9IHNjZW5lSGVpZ2h0IC8gNlxuICAgIG9wdC5mb250U2l6ZSA9IG9wdC53aWR0aCAvIDEwXG4gIH0gZWxzZSB7XG4gICAgb3B0LndpZHRoID0gc2NlbmVXaWR0aCA8IDQwMCA/IHNjZW5lV2lkdGggLyAyIDogc2NlbmVXaWR0aCAvIDRcbiAgICBvcHQuaGVpZ2h0ID0gc2NlbmVIZWlnaHQgLyAzXG4gICAgb3B0LmZvbnRTaXplID0gb3B0LndpZHRoIC8gMjBcbiAgfVxuICByZXR1cm4gb3B0XG59XG5cbmZ1bmN0aW9uIGdldEludmVudG9yeVdpbmRvd09wdCAocGxheWVyKSB7XG4gIGxldCBvcHQgPSB7XG4gICAgcGxheWVyXG4gIH1cbiAgb3B0LnkgPSAwXG4gIGlmIChJU19NT0JJTEUpIHtcbiAgICBvcHQud2lkdGggPSBzY2VuZVdpZHRoIC8gNlxuICB9IGVsc2Uge1xuICAgIGxldCBkaXZpZGUgPSBzY2VuZVdpZHRoIDwgNDAwID8gNiA6IHNjZW5lV2lkdGggPCA4MDAgPyAxMiA6IDIwXG4gICAgb3B0LndpZHRoID0gc2NlbmVXaWR0aCAvIGRpdmlkZVxuICB9XG4gIG9wdC54ID0gc2NlbmVXaWR0aCAtIG9wdC53aWR0aFxuICByZXR1cm4gb3B0XG59XG5cbmNsYXNzIFBsYXlTY2VuZSBleHRlbmRzIFNjZW5lIHtcbiAgY29uc3RydWN0b3IgKHsgbWFwRmlsZSwgcG9zaXRpb24gfSkge1xuICAgIHN1cGVyKClcblxuICAgIHRoaXMubWFwRmlsZSA9IG1hcEZpbGVcbiAgICB0aGlzLnRvUG9zaXRpb24gPSBwb3NpdGlvblxuICB9XG5cbiAgY3JlYXRlICgpIHtcbiAgICBzY2VuZVdpZHRoID0gdGhpcy5wYXJlbnQud2lkdGhcbiAgICBzY2VuZUhlaWdodCA9IHRoaXMucGFyZW50LmhlaWdodFxuICAgIHRoaXMuaXNNYXBMb2FkZWQgPSBmYWxzZVxuICAgIHRoaXMubG9hZE1hcCgpXG4gICAgdGhpcy5pbml0UGxheWVyKClcbiAgICB0aGlzLmluaXRVaSgpXG4gIH1cblxuICBpbml0VWkgKCkge1xuICAgIGxldCB1aUdyb3VwID0gbmV3IGRpc3BsYXkuR3JvdXAoMCwgdHJ1ZSlcbiAgICBsZXQgdWlMYXllciA9IG5ldyBkaXNwbGF5LkxheWVyKHVpR3JvdXApXG4gICAgdWlMYXllci5wYXJlbnRMYXllciA9IHRoaXNcbiAgICB1aUxheWVyLmdyb3VwLmVuYWJsZVNvcnQgPSB0cnVlXG4gICAgdGhpcy5hZGRDaGlsZCh1aUxheWVyKVxuXG4gICAgbGV0IG1lc3NhZ2VXaW5kb3cgPSBuZXcgTWVzc2FnZVdpbmRvdyhnZXRNZXNzYWdlV2luZG93T3B0KCkpXG4gICAgbGV0IHBsYXllcldpbmRvdyA9IG5ldyBQbGF5ZXJXaW5kb3coZ2V0UGxheWVyV2luZG93T3B0KHRoaXMuY2F0KSlcbiAgICBsZXQgaW52ZW50b3J5V2luZG93ID0gbmV3IEludmVudG9yeVdpbmRvdyhnZXRJbnZlbnRvcnlXaW5kb3dPcHQodGhpcy5jYXQpKVxuXG4gICAgLy8g6K6TVUnpoa/npLrlnKjpoILlsaRcbiAgICBtZXNzYWdlV2luZG93LnBhcmVudEdyb3VwID0gdWlHcm91cFxuICAgIHBsYXllcldpbmRvdy5wYXJlbnRHcm91cCA9IHVpR3JvdXBcbiAgICBpbnZlbnRvcnlXaW5kb3cucGFyZW50R3JvdXAgPSB1aUdyb3VwXG4gICAgdWlMYXllci5hZGRDaGlsZChtZXNzYWdlV2luZG93KVxuICAgIHVpTGF5ZXIuYWRkQ2hpbGQocGxheWVyV2luZG93KVxuICAgIHVpTGF5ZXIuYWRkQ2hpbGQoaW52ZW50b3J5V2luZG93KVxuXG4gICAgaWYgKElTX01PQklMRSkge1xuICAgICAgLy8g5Y+q5pyJ5omL5qmf6KaB6Ke45o6n5p2/XG4gICAgICAvLyDmlrnlkJHmjqfliLZcbiAgICAgIGxldCBkaXJlY3Rpb25QYW5lbCA9IG5ldyBUb3VjaERpcmVjdGlvbkNvbnRyb2xQYW5lbCh7XG4gICAgICAgIHg6IHNjZW5lV2lkdGggLyA0LFxuICAgICAgICB5OiBzY2VuZUhlaWdodCAqIDQgLyA2LFxuICAgICAgICByYWRpdXM6IHNjZW5lV2lkdGggLyAxMFxuICAgICAgfSlcbiAgICAgIGRpcmVjdGlvblBhbmVsLnBhcmVudEdyb3VwID0gdWlHcm91cFxuXG4gICAgICAvLyDmk43kvZzmjqfliLZcbiAgICAgIGxldCBvcGVyYXRpb25QYW5lbCA9IG5ldyBUb3VjaE9wZXJhdGlvbkNvbnRyb2xQYW5lbCh7XG4gICAgICAgIHg6IHNjZW5lV2lkdGggLyA0ICogMyxcbiAgICAgICAgeTogc2NlbmVIZWlnaHQgKiA0IC8gNixcbiAgICAgICAgcmFkaXVzOiBzY2VuZVdpZHRoIC8gMTBcbiAgICAgIH0pXG4gICAgICBvcGVyYXRpb25QYW5lbC5wYXJlbnRHcm91cCA9IHVpR3JvdXBcblxuICAgICAgdWlMYXllci5hZGRDaGlsZChkaXJlY3Rpb25QYW5lbClcbiAgICAgIHVpTGF5ZXIuYWRkQ2hpbGQob3BlcmF0aW9uUGFuZWwpXG4gICAgICAvLyByZXF1aXJlKCcuLi9saWIvZGVtbycpXG4gICAgfVxuICAgIG1lc3NhZ2VXaW5kb3cuYWRkKFsnc2NlbmUgc2l6ZTogKCcsIHNjZW5lV2lkdGgsICcsICcsIHNjZW5lSGVpZ2h0LCAnKS4nXS5qb2luKCcnKSlcbiAgfVxuXG4gIGluaXRQbGF5ZXIgKCkge1xuICAgIGlmICghdGhpcy5jYXQpIHtcbiAgICAgIHRoaXMuY2F0ID0gbmV3IENhdCgpXG4gICAgfVxuICB9XG5cbiAgbG9hZE1hcCAoKSB7XG4gICAgbGV0IGZpbGVOYW1lID0gJ3dvcmxkLycgKyB0aGlzLm1hcEZpbGVcblxuICAgIC8vIGlmIG1hcCBub3QgbG9hZGVkIHlldFxuICAgIGlmICghcmVzb3VyY2VzW2ZpbGVOYW1lXSkge1xuICAgICAgbG9hZGVyXG4gICAgICAgIC5hZGQoZmlsZU5hbWUsIGZpbGVOYW1lICsgJy5qc29uJylcbiAgICAgICAgLmxvYWQodGhpcy5zcGF3bk1hcC5iaW5kKHRoaXMsIGZpbGVOYW1lKSlcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zcGF3bk1hcChmaWxlTmFtZSlcbiAgICB9XG4gIH1cblxuICBzcGF3bk1hcCAoZmlsZU5hbWUpIHtcbiAgICBsZXQgbWFwRGF0YSA9IHJlc291cmNlc1tmaWxlTmFtZV0uZGF0YVxuICAgIGxldCBtYXBTY2FsZSA9IElTX01PQklMRSA/IDIgOiAwLjVcblxuICAgIGxldCBtYXAgPSBuZXcgTWFwKG1hcFNjYWxlKVxuICAgIHRoaXMuYWRkQ2hpbGQobWFwKVxuICAgIG1hcC5sb2FkKG1hcERhdGEpXG5cbiAgICBtYXAub24oJ3VzZScsIG8gPT4ge1xuICAgICAgdGhpcy5pc01hcExvYWRlZCA9IGZhbHNlXG4gICAgICAvLyBjbGVhciBvbGQgbWFwXG4gICAgICB0aGlzLnJlbW92ZUNoaWxkKHRoaXMubWFwKVxuICAgICAgdGhpcy5tYXAuZGVzdHJveSgpXG5cbiAgICAgIHRoaXMubWFwRmlsZSA9IG8ubWFwXG4gICAgICB0aGlzLnRvUG9zaXRpb24gPSBvLnRvUG9zaXRpb25cbiAgICAgIHRoaXMubG9hZE1hcCgpXG4gICAgfSlcblxuICAgIG1hcC5hZGRQbGF5ZXIodGhpcy5jYXQsIHRoaXMudG9Qb3NpdGlvbilcbiAgICB0aGlzLm1hcCA9IG1hcFxuXG4gICAgdGhpcy5pc01hcExvYWRlZCA9IHRydWVcbiAgfVxuXG4gIHRpY2sgKGRlbHRhKSB7XG4gICAgaWYgKCF0aGlzLmlzTWFwTG9hZGVkKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgdGhpcy5tYXAudGljayhkZWx0YSlcbiAgICAvLyBGSVhNRTogZ2FwIGJldHdlZW4gdGlsZXMgb24gaVBob25lIFNhZmFyaVxuICAgIHRoaXMubWFwLnBvc2l0aW9uLnNldChcbiAgICAgIE1hdGguZmxvb3Ioc2NlbmVXaWR0aCAvIDIgLSB0aGlzLmNhdC54KSxcbiAgICAgIE1hdGguZmxvb3Ioc2NlbmVIZWlnaHQgLyAyIC0gdGhpcy5jYXQueSlcbiAgICApXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUGxheVNjZW5lXG4iLCJpbXBvcnQgV2luZG93IGZyb20gJy4vV2luZG93J1xuaW1wb3J0IHsgQ29udGFpbmVyLCBHcmFwaGljcywgVGV4dCwgVGV4dFN0eWxlIH0gZnJvbSAnLi4vbGliL1BJWEknXG5pbXBvcnQgeyBBQklMSVRZX0NBUlJZIH0gZnJvbSAnLi4vY29uZmlnL2NvbnN0YW50cydcblxuY2xhc3MgU2xvdCBleHRlbmRzIENvbnRhaW5lciB7XG4gIGNvbnN0cnVjdG9yICh7IHgsIHksIHdpZHRoLCBoZWlnaHQgfSkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLnBvc2l0aW9uLnNldCh4LCB5KVxuXG4gICAgbGV0IHJlY3QgPSBuZXcgR3JhcGhpY3MoKVxuICAgIHJlY3QuYmVnaW5GaWxsKDB4QTJBMkEyKVxuICAgIHJlY3QuZHJhd1JvdW5kZWRSZWN0KDAsIDAsIHdpZHRoLCBoZWlnaHQsIDUpXG4gICAgcmVjdC5lbmRGaWxsKClcbiAgICB0aGlzLmFkZENoaWxkKHJlY3QpXG4gIH1cblxuICBzZXRDb250ZXh0IChpdGVtLCBjb3VudCkge1xuICAgIHRoaXMuY2xlYXJDb250ZXh0KClcblxuICAgIGxldCB3aWR0aCA9IHRoaXMud2lkdGhcbiAgICBsZXQgaGVpZ2h0ID0gdGhpcy5oZWlnaHRcbiAgICAvLyDnva7kuK1cbiAgICBpdGVtID0gbmV3IGl0ZW0uY29uc3RydWN0b3IoKVxuICAgIGl0ZW0ud2lkdGggPSB3aWR0aCAqIDAuOFxuICAgIGl0ZW0uaGVpZ2h0ID0gaGVpZ2h0ICogMC44XG4gICAgaXRlbS5hbmNob3Iuc2V0KDAuNSwgMC41KVxuICAgIGl0ZW0ucG9zaXRpb24uc2V0KHdpZHRoIC8gMiwgaGVpZ2h0IC8gMilcbiAgICB0aGlzLmFkZENoaWxkKGl0ZW0pXG5cbiAgICAvLyDmlbjph49cbiAgICBsZXQgZm9udFNpemUgPSB0aGlzLndpZHRoICogMC4zXG4gICAgbGV0IHN0eWxlID0gbmV3IFRleHRTdHlsZSh7XG4gICAgICBmb250U2l6ZTogZm9udFNpemUsXG4gICAgICBmaWxsOiAncmVkJyxcbiAgICAgIGZvbnRXZWlnaHQ6ICc2MDAnLFxuICAgICAgbGluZUhlaWdodDogZm9udFNpemVcbiAgICB9KVxuICAgIGxldCB0ZXh0ID0gbmV3IFRleHQoY291bnQsIHN0eWxlKVxuICAgIHRleHQucG9zaXRpb24uc2V0KHdpZHRoICogMC45NSwgaGVpZ2h0KVxuICAgIHRleHQuYW5jaG9yLnNldCgxLCAxKVxuICAgIHRoaXMuYWRkQ2hpbGQodGV4dClcblxuICAgIHRoaXMuaXRlbSA9IGl0ZW1cbiAgICB0aGlzLnRleHQgPSB0ZXh0XG4gIH1cblxuICBjbGVhckNvbnRleHQgKCkge1xuICAgIGlmICh0aGlzLml0ZW0pIHtcbiAgICAgIHRoaXMuaXRlbS5kZXN0cm95KClcbiAgICAgIHRoaXMudGV4dC5kZXN0cm95KClcbiAgICAgIGRlbGV0ZSB0aGlzLml0ZW1cbiAgICAgIGRlbGV0ZSB0aGlzLnRleHRcbiAgICB9XG4gIH1cbn1cblxuY2xhc3MgSW52ZW50b3J5V2luZG93IGV4dGVuZHMgV2luZG93IHtcbiAgY29uc3RydWN0b3IgKG9wdCkge1xuICAgIGxldCB7IHBsYXllciwgd2lkdGggfSA9IG9wdFxuICAgIGxldCBwYWRkaW5nID0gd2lkdGggKiAwLjFcbiAgICBsZXQgY2VpbFNpemUgPSB3aWR0aCAtIHBhZGRpbmcgKiAyXG4gICAgbGV0IGNlaWxPcHQgPSB7XG4gICAgICB4OiBwYWRkaW5nLFxuICAgICAgeTogcGFkZGluZyxcbiAgICAgIHdpZHRoOiBjZWlsU2l6ZSxcbiAgICAgIGhlaWdodDogY2VpbFNpemVcbiAgICB9XG4gICAgbGV0IHNsb3RDb3VudCA9IDRcbiAgICBvcHQuaGVpZ2h0ID0gKHdpZHRoIC0gcGFkZGluZykgKiBzbG90Q291bnQgKyBwYWRkaW5nXG5cbiAgICBzdXBlcihvcHQpXG5cbiAgICB0aGlzLl9vcHQgPSBvcHRcbiAgICBwbGF5ZXIub24oJ2ludmVudG9yeS1tb2RpZmllZCcsIHRoaXMub25JbnZlbnRvcnlNb2RpZmllZC5iaW5kKHRoaXMsIHBsYXllcikpXG5cbiAgICB0aGlzLnNsb3RDb250YWluZXJzID0gW11cbiAgICB0aGlzLnNsb3RzID0gW11cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNsb3RDb3VudDsgaSsrKSB7XG4gICAgICBsZXQgc2xvdCA9IG5ldyBTbG90KGNlaWxPcHQpXG4gICAgICB0aGlzLmFkZENoaWxkKHNsb3QpXG4gICAgICB0aGlzLnNsb3RDb250YWluZXJzLnB1c2goc2xvdClcbiAgICAgIGNlaWxPcHQueSArPSBjZWlsU2l6ZSArIHBhZGRpbmdcbiAgICB9XG5cbiAgICB0aGlzLm9uSW52ZW50b3J5TW9kaWZpZWQocGxheWVyKVxuICB9XG5cbiAgb25JbnZlbnRvcnlNb2RpZmllZCAocGxheWVyKSB7XG4gICAgbGV0IGNhcnJ5QWJpbGl0eSA9IHBsYXllcltBQklMSVRZX0NBUlJZXVxuICAgIGlmICghY2FycnlBYmlsaXR5KSB7XG4gICAgICAvLyBubyBpbnZlbnRvcnkgeWV0XG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgbGV0IGkgPSAwXG4gICAgY2FycnlBYmlsaXR5LmJhZ3MuZm9yRWFjaChiYWcgPT4gYmFnLmZvckVhY2goc2xvdCA9PiB7XG4gICAgICB0aGlzLnNsb3RzW2ldID0gc2xvdFxuICAgICAgaSsrXG4gICAgfSkpXG4gICAgdGhpcy5zbG90Q29udGFpbmVycy5mb3JFYWNoKChjb250YWluZXIsIGkpID0+IHtcbiAgICAgIGxldCBzbG90ID0gdGhpcy5zbG90c1tpXVxuICAgICAgaWYgKHNsb3QpIHtcbiAgICAgICAgY29udGFpbmVyLnNldENvbnRleHQoc2xvdC5pdGVtLCBzbG90LmNvdW50KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29udGFpbmVyLmNsZWFyQ29udGV4dCgpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ3dpbmRvdydcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBJbnZlbnRvcnlXaW5kb3dcbiIsImltcG9ydCB7IFRleHQsIFRleHRTdHlsZSB9IGZyb20gJy4uL2xpYi9QSVhJJ1xuXG5pbXBvcnQgU2Nyb2xsYWJsZVdpbmRvdyBmcm9tICcuL1Njcm9sbGFibGVXaW5kb3cnXG5pbXBvcnQgbWVzc2FnZXMgZnJvbSAnLi4vbGliL01lc3NhZ2VzJ1xuXG5jbGFzcyBNZXNzYWdlV2luZG93IGV4dGVuZHMgU2Nyb2xsYWJsZVdpbmRvdyB7XG4gIGNvbnN0cnVjdG9yIChvcHQpIHtcbiAgICBzdXBlcihvcHQpXG5cbiAgICBsZXQgeyBmb250U2l6ZSA9IDEyIH0gPSBvcHRcblxuICAgIGxldCBzdHlsZSA9IG5ldyBUZXh0U3R5bGUoe1xuICAgICAgZm9udFNpemU6IGZvbnRTaXplLFxuICAgICAgZmlsbDogJ2dyZWVuJyxcbiAgICAgIGJyZWFrV29yZHM6IHRydWUsXG4gICAgICB3b3JkV3JhcDogdHJ1ZSxcbiAgICAgIHdvcmRXcmFwV2lkdGg6IHRoaXMud2luZG93V2lkdGhcbiAgICB9KVxuICAgIGxldCB0ZXh0ID0gbmV3IFRleHQoJycsIHN0eWxlKVxuXG4gICAgdGhpcy5hZGRXaW5kb3dDaGlsZCh0ZXh0KVxuICAgIHRoaXMudGV4dCA9IHRleHRcblxuICAgIHRoaXMuYXV0b1Njcm9sbFRvQm90dG9tID0gdHJ1ZVxuXG4gICAgbWVzc2FnZXMub24oJ21vZGlmaWVkJywgdGhpcy5tb2RpZmllZC5iaW5kKHRoaXMpKVxuICB9XG5cbiAgbW9kaWZpZWQgKCkge1xuICAgIGxldCBzY3JvbGxQZXJjZW50ID0gdGhpcy5zY3JvbGxQZXJjZW50XG4gICAgdGhpcy50ZXh0LnRleHQgPSBbXS5jb25jYXQobWVzc2FnZXMubGlzdCkucmV2ZXJzZSgpLmpvaW4oJ1xcbicpXG4gICAgdGhpcy51cGRhdGVTY3JvbGxCYXJMZW5ndGgoKVxuXG4gICAgLy8g6Iulc2Nyb2xs572u5bqV77yM6Ieq5YuV5o2y5YuV572u5bqVXG4gICAgaWYgKHNjcm9sbFBlcmNlbnQgPT09IDEpIHtcbiAgICAgIHRoaXMuc2Nyb2xsVG8oMSlcbiAgICB9XG4gIH1cblxuICBhZGQgKG1zZykge1xuICAgIG1lc3NhZ2VzLmFkZChtc2cpXG4gIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdtZXNzYWdlLXdpbmRvdydcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBNZXNzYWdlV2luZG93XG4iLCJpbXBvcnQgeyBDb250YWluZXIsIFRleHQsIFRleHRTdHlsZSB9IGZyb20gJy4uL2xpYi9QSVhJJ1xuXG5pbXBvcnQgV2luZG93IGZyb20gJy4vV2luZG93J1xuaW1wb3J0IHsgQUJJTElUWV9NT1ZFLCBBQklMSVRZX0NBTUVSQSwgQUJJTElUWV9PUEVSQVRFLCBBQklMSVRZX0NBUlJZLCBBQklMSVRZX1BMQUNFIH0gZnJvbSAnLi4vY29uZmlnL2NvbnN0YW50cydcblxuY29uc3QgQUJJTElUSUVTX0FMTCA9IFtcbiAgQUJJTElUWV9NT1ZFLFxuICBBQklMSVRZX0NBTUVSQSxcbiAgQUJJTElUWV9PUEVSQVRFLFxuICBBQklMSVRZX1BMQUNFXG5dXG5cbmNsYXNzIFBsYXllcldpbmRvdyBleHRlbmRzIFdpbmRvdyB7XG4gIGNvbnN0cnVjdG9yIChvcHQpIHtcbiAgICBzdXBlcihvcHQpXG4gICAgbGV0IHsgcGxheWVyIH0gPSBvcHRcbiAgICB0aGlzLl9vcHQgPSBvcHRcbiAgICBwbGF5ZXIub24oJ2FiaWxpdHktY2FycnknLCB0aGlzLm9uQWJpbGl0eUNhcnJ5LmJpbmQodGhpcywgcGxheWVyKSlcblxuICAgIHRoaXMuYWJpbGl0eVRleHRDb250YWluZXIgPSBuZXcgQ29udGFpbmVyKClcbiAgICB0aGlzLmFiaWxpdHlUZXh0Q29udGFpbmVyLnggPSA1XG4gICAgdGhpcy5hZGRDaGlsZCh0aGlzLmFiaWxpdHlUZXh0Q29udGFpbmVyKVxuXG4gICAgdGhpcy5vbkFiaWxpdHlDYXJyeShwbGF5ZXIpXG4gIH1cblxuICBvbkFiaWxpdHlDYXJyeSAocGxheWVyKSB7XG4gICAgbGV0IGkgPSAwXG4gICAgbGV0IHsgZm9udFNpemUgPSAxMCB9ID0gdGhpcy5fb3B0XG4gICAgbGV0IHN0eWxlID0gbmV3IFRleHRTdHlsZSh7XG4gICAgICBmb250U2l6ZTogZm9udFNpemUsXG4gICAgICBmaWxsOiAnZ3JlZW4nLFxuICAgICAgbGluZUhlaWdodDogZm9udFNpemVcbiAgICB9KVxuXG4gICAgLy8g5pu05paw6Z2i5p2/5pW45pOaXG4gICAgbGV0IGNvbnRpYW5lciA9IHRoaXMuYWJpbGl0eVRleHRDb250YWluZXJcbiAgICBjb250aWFuZXIucmVtb3ZlQ2hpbGRyZW4oKVxuICAgIEFCSUxJVElFU19BTEwuZm9yRWFjaChhYmlsaXR5U3ltYm9sID0+IHtcbiAgICAgIGxldCBhYmlsaXR5ID0gcGxheWVyLmFiaWxpdGllc1thYmlsaXR5U3ltYm9sXVxuICAgICAgaWYgKGFiaWxpdHkpIHtcbiAgICAgICAgbGV0IHRleHQgPSBuZXcgVGV4dChhYmlsaXR5LnRvU3RyaW5nKCksIHN0eWxlKVxuICAgICAgICB0ZXh0LnkgPSBpICogKGZvbnRTaXplICsgNSlcblxuICAgICAgICBjb250aWFuZXIuYWRkQ2hpbGQodGV4dClcblxuICAgICAgICBpKytcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgdG9TdHJpbmcgKCkge1xuICAgIHJldHVybiAnd2luZG93J1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFBsYXllcldpbmRvd1xuIiwiaW1wb3J0IHsgQ29udGFpbmVyLCBHcmFwaGljcyB9IGZyb20gJy4uL2xpYi9QSVhJJ1xuXG5pbXBvcnQgV2luZG93IGZyb20gJy4vV2luZG93J1xuaW1wb3J0IFdyYXBwZXIgZnJvbSAnLi9XcmFwcGVyJ1xuXG5jbGFzcyBTY3JvbGxhYmxlV2luZG93IGV4dGVuZHMgV2luZG93IHtcbiAgY29uc3RydWN0b3IgKG9wdCkge1xuICAgIHN1cGVyKG9wdClcbiAgICBsZXQge1xuICAgICAgd2lkdGgsXG4gICAgICBoZWlnaHQsXG4gICAgICBwYWRkaW5nID0gOCxcbiAgICAgIHNjcm9sbEJhcldpZHRoID0gMTBcbiAgICB9ID0gb3B0XG4gICAgdGhpcy5fb3B0ID0gb3B0XG5cbiAgICB0aGlzLl9pbml0U2Nyb2xsYWJsZUFyZWEoXG4gICAgICB3aWR0aCAtIHBhZGRpbmcgKiAyIC0gc2Nyb2xsQmFyV2lkdGggLSA1LFxuICAgICAgaGVpZ2h0IC0gcGFkZGluZyAqIDIsXG4gICAgICBwYWRkaW5nKVxuICAgIHRoaXMuX2luaXRTY3JvbGxCYXIoe1xuICAgICAgLy8gd2luZG93IHdpZHRoIC0gd2luZG93IHBhZGRpbmcgLSBiYXIgd2lkdGhcbiAgICAgIHg6IHdpZHRoIC0gcGFkZGluZyAtIHNjcm9sbEJhcldpZHRoLFxuICAgICAgeTogcGFkZGluZyxcbiAgICAgIHdpZHRoOiBzY3JvbGxCYXJXaWR0aCxcbiAgICAgIGhlaWdodDogaGVpZ2h0IC0gcGFkZGluZyAqIDJcbiAgICB9KVxuICB9XG5cbiAgX2luaXRTY3JvbGxhYmxlQXJlYSAod2lkdGgsIGhlaWdodCwgcGFkZGluZykge1xuICAgIC8vIGhvbGQgcGFkZGluZ1xuICAgIGxldCBfbWFpblZpZXcgPSBuZXcgQ29udGFpbmVyKClcbiAgICBfbWFpblZpZXcucG9zaXRpb24uc2V0KHBhZGRpbmcsIHBhZGRpbmcpXG4gICAgdGhpcy5hZGRDaGlsZChfbWFpblZpZXcpXG5cbiAgICB0aGlzLm1haW5WaWV3ID0gbmV3IENvbnRhaW5lcigpXG4gICAgX21haW5WaWV3LmFkZENoaWxkKHRoaXMubWFpblZpZXcpXG5cbiAgICAvLyBoaWRlIG1haW5WaWV3J3Mgb3ZlcmZsb3dcbiAgICBsZXQgbWFzayA9IG5ldyBHcmFwaGljcygpXG4gICAgbWFzay5iZWdpbkZpbGwoMHhGRkZGRkYpXG4gICAgbWFzay5kcmF3Um91bmRlZFJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCwgNSlcbiAgICBtYXNrLmVuZEZpbGwoKVxuICAgIHRoaXMubWFpblZpZXcubWFzayA9IG1hc2tcbiAgICBfbWFpblZpZXcuYWRkQ2hpbGQobWFzaylcblxuICAgIC8vIHdpbmRvdyB3aWR0aCAtIHdpbmRvdyBwYWRkaW5nICogMiAtIGJhciB3aWR0aCAtIGJldHdlZW4gc3BhY2VcbiAgICB0aGlzLl93aW5kb3dXaWR0aCA9IHdpZHRoXG4gICAgdGhpcy5fd2luZG93SGVpZ2h0ID0gaGVpZ2h0XG4gIH1cblxuICBfaW5pdFNjcm9sbEJhciAoeyB4LCB5LCB3aWR0aCwgaGVpZ2h0IH0pIHtcbiAgICBsZXQgY29uYXRpbmVyID0gbmV3IENvbnRhaW5lcigpXG4gICAgY29uYXRpbmVyLnggPSB4XG4gICAgY29uYXRpbmVyLnkgPSB5XG5cbiAgICBsZXQgc2Nyb2xsQmFyQmcgPSBuZXcgR3JhcGhpY3MoKVxuICAgIHNjcm9sbEJhckJnLmJlZ2luRmlsbCgweEE4QThBOClcbiAgICBzY3JvbGxCYXJCZy5kcmF3Um91bmRlZFJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCwgMilcbiAgICBzY3JvbGxCYXJCZy5lbmRGaWxsKClcblxuICAgIGxldCBzY3JvbGxCYXIgPSBuZXcgR3JhcGhpY3MoKVxuICAgIHNjcm9sbEJhci5iZWdpbkZpbGwoMHgyMjIyMjIpXG4gICAgc2Nyb2xsQmFyLmRyYXdSb3VuZGVkUmVjdCgwLCAwLCB3aWR0aCwgaGVpZ2h0LCAzKVxuICAgIHNjcm9sbEJhci5lbmRGaWxsKClcbiAgICBzY3JvbGxCYXIudG9TdHJpbmcgPSAoKSA9PiAnc2Nyb2xsQmFyJ1xuICAgIFdyYXBwZXIuZHJhZ2dhYmxlKHNjcm9sbEJhciwge1xuICAgICAgYm91bmRhcnk6IHtcbiAgICAgICAgeDogMCxcbiAgICAgICAgeTogMCxcbiAgICAgICAgd2lkdGg6IHdpZHRoLFxuICAgICAgICBoZWlnaHQ6IGhlaWdodFxuICAgICAgfVxuICAgIH0pXG4gICAgc2Nyb2xsQmFyLm9uKCdkcmFnJywgdGhpcy5zY3JvbGxNYWluVmlldy5iaW5kKHRoaXMpKVxuXG4gICAgY29uYXRpbmVyLmFkZENoaWxkKHNjcm9sbEJhckJnKVxuICAgIGNvbmF0aW5lci5hZGRDaGlsZChzY3JvbGxCYXIpXG4gICAgdGhpcy5hZGRDaGlsZChjb25hdGluZXIpXG4gICAgdGhpcy5zY3JvbGxCYXIgPSBzY3JvbGxCYXJcbiAgICB0aGlzLnNjcm9sbEJhckJnID0gc2Nyb2xsQmFyQmdcbiAgfVxuXG4gIC8vIOaNsuWLleimlueql1xuICBzY3JvbGxNYWluVmlldyAoKSB7XG4gICAgdGhpcy5tYWluVmlldy55ID0gKHRoaXMud2luZG93SGVpZ2h0IC0gdGhpcy5tYWluVmlldy5oZWlnaHQpICogdGhpcy5zY3JvbGxQZXJjZW50XG4gIH1cblxuICAvLyDmlrDlop7nianku7boh7PoppbnqpdcbiAgYWRkV2luZG93Q2hpbGQgKGNoaWxkKSB7XG4gICAgdGhpcy5tYWluVmlldy5hZGRDaGlsZChjaGlsZClcbiAgfVxuXG4gIC8vIOabtOaWsOaNsuWLleajkuWkp+Wwjywg5LiN5LiA5a6a6KaB6Kq/55SoXG4gIHVwZGF0ZVNjcm9sbEJhckxlbmd0aCAoKSB7XG4gICAgbGV0IHsgc2Nyb2xsQmFyTWluSGVpZ2h0ID0gMjAgfSA9IHRoaXMuX29wdFxuXG4gICAgbGV0IGRoID0gdGhpcy5tYWluVmlldy5oZWlnaHQgLyB0aGlzLndpbmRvd0hlaWdodFxuICAgIGlmIChkaCA8IDEpIHtcbiAgICAgIHRoaXMuc2Nyb2xsQmFyLmhlaWdodCA9IHRoaXMuc2Nyb2xsQmFyQmcuaGVpZ2h0XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2Nyb2xsQmFyLmhlaWdodCA9IHRoaXMuc2Nyb2xsQmFyQmcuaGVpZ2h0IC8gZGhcbiAgICAgIC8vIOmBv+WFjeWkquWwj+W+iOmbo+aLluabs1xuICAgICAgdGhpcy5zY3JvbGxCYXIuaGVpZ2h0ID0gTWF0aC5tYXgoc2Nyb2xsQmFyTWluSGVpZ2h0LCB0aGlzLnNjcm9sbEJhci5oZWlnaHQpXG4gICAgfVxuICAgIHRoaXMuc2Nyb2xsQmFyLmZhbGxiYWNrVG9Cb3VuZGFyeSgpXG4gIH1cblxuICAvLyDmjbLli5Xnmb7liIbmr5RcbiAgZ2V0IHNjcm9sbFBlcmNlbnQgKCkge1xuICAgIGxldCBkZWx0YSA9IHRoaXMuc2Nyb2xsQmFyQmcuaGVpZ2h0IC0gdGhpcy5zY3JvbGxCYXIuaGVpZ2h0XG4gICAgcmV0dXJuIGRlbHRhID09PSAwID8gMSA6IHRoaXMuc2Nyb2xsQmFyLnkgLyBkZWx0YVxuICB9XG5cbiAgLy8g5o2y5YuV6Iez55m+5YiG5q+UXG4gIHNjcm9sbFRvIChwZXJjZW50KSB7XG4gICAgbGV0IGRlbHRhID0gdGhpcy5zY3JvbGxCYXJCZy5oZWlnaHQgLSB0aGlzLnNjcm9sbEJhci5oZWlnaHRcbiAgICBsZXQgeSA9IDBcbiAgICBpZiAoZGVsdGEgIT09IDApIHtcbiAgICAgIHkgPSBkZWx0YSAqIHBlcmNlbnRcbiAgICB9XG4gICAgdGhpcy5zY3JvbGxCYXIueSA9IHlcbiAgICB0aGlzLnNjcm9sbE1haW5WaWV3KClcbiAgfVxuXG4gIGdldCB3aW5kb3dXaWR0aCAoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3dpbmRvd1dpZHRoXG4gIH1cblxuICBnZXQgd2luZG93SGVpZ2h0ICgpIHtcbiAgICByZXR1cm4gdGhpcy5fd2luZG93SGVpZ2h0XG4gIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICd3aW5kb3cnXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgU2Nyb2xsYWJsZVdpbmRvd1xuIiwiaW1wb3J0IHsgQ29udGFpbmVyLCBHcmFwaGljcyB9IGZyb20gJy4uL2xpYi9QSVhJJ1xuaW1wb3J0IFZlY3RvciBmcm9tICcuLi9saWIvVmVjdG9yJ1xuXG5pbXBvcnQga2V5Ym9hcmRKUyBmcm9tICdrZXlib2FyZGpzJ1xuaW1wb3J0IHsgTEVGVCwgVVAsIFJJR0hULCBET1dOIH0gZnJvbSAnLi4vY29uZmlnL2NvbnRyb2wnXG5cbmNvbnN0IEFMTF9LRVlTID0gW1JJR0hULCBMRUZULCBVUCwgRE9XTl1cblxuY2xhc3MgVG91Y2hEaXJlY3Rpb25Db250cm9sUGFuZWwgZXh0ZW5kcyBDb250YWluZXIge1xuICBjb25zdHJ1Y3RvciAoeyB4LCB5LCByYWRpdXMgfSkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLnBvc2l0aW9uLnNldCh4LCB5KVxuXG4gICAgbGV0IHRvdWNoQXJlYSA9IG5ldyBHcmFwaGljcygpXG4gICAgdG91Y2hBcmVhLmJlZ2luRmlsbCgweEYyRjJGMiwgMC41KVxuICAgIHRvdWNoQXJlYS5kcmF3Q2lyY2xlKDAsIDAsIHJhZGl1cylcbiAgICB0b3VjaEFyZWEuZW5kRmlsbCgpXG4gICAgdGhpcy5hZGRDaGlsZCh0b3VjaEFyZWEpXG4gICAgdGhpcy5yYWRpdXMgPSByYWRpdXNcblxuICAgIHRoaXMuc2V0dXBUb3VjaCgpXG4gIH1cblxuICBzZXR1cFRvdWNoICgpIHtcbiAgICB0aGlzLmludGVyYWN0aXZlID0gdHJ1ZVxuICAgIGxldCBmID0gdGhpcy5vblRvdWNoLmJpbmQodGhpcylcbiAgICB0aGlzLm9uKCd0b3VjaHN0YXJ0JywgZilcbiAgICB0aGlzLm9uKCd0b3VjaGVuZCcsIGYpXG4gICAgdGhpcy5vbigndG91Y2htb3ZlJywgZilcbiAgICB0aGlzLm9uKCd0b3VjaGVuZG91dHNpZGUnLCBmKVxuICB9XG5cbiAgb25Ub3VjaCAoZSkge1xuICAgIGxldCB0eXBlID0gZS50eXBlXG4gICAgbGV0IHByb3BhZ2F0aW9uID0gZmFsc2VcbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ3RvdWNoc3RhcnQnOlxuICAgICAgICB0aGlzLmRyYWcgPSBlLmRhdGEuZ2xvYmFsLmNsb25lKClcbiAgICAgICAgdGhpcy5jcmVhdGVEcmFnUG9pbnQoKVxuICAgICAgICB0aGlzLm9yaWdpblBvc2l0aW9uID0ge1xuICAgICAgICAgIHg6IHRoaXMueCxcbiAgICAgICAgICB5OiB0aGlzLnlcbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAndG91Y2hlbmQnOlxuICAgICAgY2FzZSAndG91Y2hlbmRvdXRzaWRlJzpcbiAgICAgICAgaWYgKHRoaXMuZHJhZykge1xuICAgICAgICAgIHRoaXMuZHJhZyA9IGZhbHNlXG4gICAgICAgICAgdGhpcy5kZXN0cm95RHJhZ1BvaW50KClcbiAgICAgICAgICB0aGlzLnJlbGVhc2VLZXlzKClcbiAgICAgICAgfVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAndG91Y2htb3ZlJzpcbiAgICAgICAgaWYgKCF0aGlzLmRyYWcpIHtcbiAgICAgICAgICBwcm9wYWdhdGlvbiA9IHRydWVcbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucHJlc3NLZXlzKGUuZGF0YS5nZXRMb2NhbFBvc2l0aW9uKHRoaXMpKVxuICAgICAgICBicmVha1xuICAgIH1cbiAgICBpZiAoIXByb3BhZ2F0aW9uKSB7XG4gICAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgfVxuICB9XG5cbiAgY3JlYXRlRHJhZ1BvaW50ICgpIHtcbiAgICBsZXQgZHJhZ1BvaW50ID0gbmV3IEdyYXBoaWNzKClcbiAgICBkcmFnUG9pbnQuYmVnaW5GaWxsKDB4RjJGMkYyLCAwLjUpXG4gICAgZHJhZ1BvaW50LmRyYXdDaXJjbGUoMCwgMCwgMjApXG4gICAgZHJhZ1BvaW50LmVuZEZpbGwoKVxuICAgIHRoaXMuYWRkQ2hpbGQoZHJhZ1BvaW50KVxuICAgIHRoaXMuZHJhZ1BvaW50ID0gZHJhZ1BvaW50XG4gIH1cblxuICBkZXN0cm95RHJhZ1BvaW50ICgpIHtcbiAgICB0aGlzLnJlbW92ZUNoaWxkKHRoaXMuZHJhZ1BvaW50KVxuICAgIHRoaXMuZHJhZ1BvaW50LmRlc3Ryb3koKVxuICB9XG5cbiAgcHJlc3NLZXlzIChuZXdQb2ludCkge1xuICAgIHRoaXMucmVsZWFzZUtleXMoKVxuICAgIC8vIOaEn+aHiemdiOaVj+W6plxuICAgIGxldCB0aHJlc2hvbGQgPSAzMFxuXG4gICAgbGV0IHZlY3RvciA9IFZlY3Rvci5mcm9tUG9pbnQobmV3UG9pbnQpXG4gICAgbGV0IGRlZyA9IHZlY3Rvci5kZWdcbiAgICBsZXQgbGVuID0gdmVjdG9yLmxlbmd0aFxuXG4gICAgaWYgKGxlbiA8IHRocmVzaG9sZCkge1xuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIGxldCBkZWdBYnMgPSBNYXRoLmFicyhkZWcpXG4gICAgbGV0IGR4ID0gZGVnQWJzIDwgNjcuNSA/IFJJR0hUIDogKGRlZ0FicyA+IDExMi41ID8gTEVGVCA6IGZhbHNlKVxuICAgIGxldCBkeSA9IGRlZ0FicyA8IDIyLjUgfHwgZGVnQWJzID4gMTU3LjUgPyBmYWxzZSA6IChkZWcgPCAwID8gVVAgOiBET1dOKVxuXG4gICAgaWYgKGR4IHx8IGR5KSB7XG4gICAgICBpZiAoZHgpIHtcbiAgICAgICAga2V5Ym9hcmRKUy5wcmVzc0tleShkeClcbiAgICAgIH1cbiAgICAgIGlmIChkeSkge1xuICAgICAgICBrZXlib2FyZEpTLnByZXNzS2V5KGR5KVxuICAgICAgfVxuICAgICAgdmVjdG9yLm11bHRpcGx5U2NhbGFyKHRoaXMucmFkaXVzIC8gbGVuKVxuICAgICAgdGhpcy5kcmFnUG9pbnQucG9zaXRpb24uc2V0KFxuICAgICAgICB2ZWN0b3IueCxcbiAgICAgICAgdmVjdG9yLnlcbiAgICAgIClcbiAgICB9XG4gIH1cblxuICByZWxlYXNlS2V5cyAoKSB7XG4gICAgQUxMX0tFWVMuZm9yRWFjaChrZXkgPT4ga2V5Ym9hcmRKUy5yZWxlYXNlS2V5KGtleSkpXG4gIH1cblxuICB0b1N0cmluZyAoKSB7XG4gICAgcmV0dXJuICdUb3VjaERpcmVjdGlvbkNvbnRyb2xQYW5lbCdcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBUb3VjaERpcmVjdGlvbkNvbnRyb2xQYW5lbFxuIiwiaW1wb3J0IHsgQ29udGFpbmVyLCBHcmFwaGljcyB9IGZyb20gJy4uL2xpYi9QSVhJJ1xuXG5pbXBvcnQga2V5Ym9hcmRKUyBmcm9tICdrZXlib2FyZGpzJ1xuaW1wb3J0IHsgUExBQ0UxIH0gZnJvbSAnLi4vY29uZmlnL2NvbnRyb2wnXG5cbmNsYXNzIFRvdWNoT3BlcmF0aW9uQ29udHJvbFBhbmVsIGV4dGVuZHMgQ29udGFpbmVyIHtcbiAgY29uc3RydWN0b3IgKHsgeCwgeSwgcmFkaXVzIH0pIHtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5wb3NpdGlvbi5zZXQoeCwgeSlcblxuICAgIGxldCB0b3VjaEFyZWEgPSBuZXcgR3JhcGhpY3MoKVxuICAgIHRvdWNoQXJlYS5iZWdpbkZpbGwoMHhGMkYyRjIsIDAuNSlcbiAgICB0b3VjaEFyZWEuZHJhd0NpcmNsZSgwLCAwLCByYWRpdXMpXG4gICAgdG91Y2hBcmVhLmVuZEZpbGwoKVxuICAgIHRoaXMuYWRkQ2hpbGQodG91Y2hBcmVhKVxuICAgIHRoaXMucmFkaXVzID0gcmFkaXVzXG5cbiAgICB0aGlzLnNldHVwVG91Y2goKVxuICB9XG5cbiAgc2V0dXBUb3VjaCAoKSB7XG4gICAgdGhpcy5pbnRlcmFjdGl2ZSA9IHRydWVcbiAgICBsZXQgZiA9IHRoaXMub25Ub3VjaC5iaW5kKHRoaXMpXG4gICAgdGhpcy5vbigndG91Y2hzdGFydCcsIGYpXG4gICAgdGhpcy5vbigndG91Y2hlbmQnLCBmKVxuICB9XG5cbiAgb25Ub3VjaCAoZSkge1xuICAgIGxldCB0eXBlID0gZS50eXBlXG4gICAgbGV0IHByb3BhZ2F0aW9uID0gZmFsc2VcbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ3RvdWNoc3RhcnQnOlxuICAgICAgICB0aGlzLmRyYWcgPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICd0b3VjaGVuZCc6XG4gICAgICAgIGlmICh0aGlzLmRyYWcpIHtcbiAgICAgICAgICB0aGlzLmRyYWcgPSBmYWxzZVxuICAgICAgICAgIGtleWJvYXJkSlMucHJlc3NLZXkoUExBQ0UxKVxuICAgICAgICAgIGtleWJvYXJkSlMucmVsZWFzZUtleShQTEFDRTEpXG4gICAgICAgIH1cbiAgICAgICAgYnJlYWtcbiAgICB9XG4gICAgaWYgKCFwcm9wYWdhdGlvbikge1xuICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKVxuICAgIH1cbiAgfVxuXG4gIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ1RvdWNoT3BlcmF0aW9uQ29udHJvbFBhbmVsJ1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFRvdWNoT3BlcmF0aW9uQ29udHJvbFBhbmVsXG4iLCJpbXBvcnQgeyBDb250YWluZXIsIEdyYXBoaWNzIH0gZnJvbSAnLi4vbGliL1BJWEknXG5cbmNsYXNzIFdpbmRvdyBleHRlbmRzIENvbnRhaW5lciB7XG4gIGNvbnN0cnVjdG9yICh7IHgsIHksIHdpZHRoLCBoZWlnaHQgfSkge1xuICAgIHN1cGVyKClcbiAgICB0aGlzLnBvc2l0aW9uLnNldCh4LCB5KVxuXG4gICAgbGV0IGxpbmVXaWR0aCA9IDNcblxuICAgIGxldCB3aW5kb3dCZyA9IG5ldyBHcmFwaGljcygpXG4gICAgd2luZG93QmcuYmVnaW5GaWxsKDB4RjJGMkYyKVxuICAgIHdpbmRvd0JnLmxpbmVTdHlsZShsaW5lV2lkdGgsIDB4MjIyMjIyLCAxKVxuICAgIHdpbmRvd0JnLmRyYXdSb3VuZGVkUmVjdChcbiAgICAgIDAsIDAsXG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodCxcbiAgICAgIDUpXG4gICAgd2luZG93QmcuZW5kRmlsbCgpXG4gICAgdGhpcy5hZGRDaGlsZCh3aW5kb3dCZylcbiAgfVxuXG4gIHRvU3RyaW5nICgpIHtcbiAgICByZXR1cm4gJ3dpbmRvdydcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBXaW5kb3dcbiIsImNvbnN0IE9QVCA9IFN5bWJvbCgnb3B0JylcblxuZnVuY3Rpb24gX2VuYWJsZURyYWdnYWJsZSAoKSB7XG4gIHRoaXMuZHJhZyA9IGZhbHNlXG4gIHRoaXMuaW50ZXJhY3RpdmUgPSB0cnVlXG4gIGxldCBmID0gX29uVG91Y2guYmluZCh0aGlzKVxuICB0aGlzLm9uKCd0b3VjaHN0YXJ0JywgZilcbiAgdGhpcy5vbigndG91Y2hlbmQnLCBmKVxuICB0aGlzLm9uKCd0b3VjaG1vdmUnLCBmKVxuICB0aGlzLm9uKCd0b3VjaGVuZG91dHNpZGUnLCBmKVxuICB0aGlzLm9uKCdtb3VzZWRvd24nLCBmKVxuICB0aGlzLm9uKCdtb3VzZXVwJywgZilcbiAgdGhpcy5vbignbW91c2Vtb3ZlJywgZilcbiAgdGhpcy5vbignbW91c2V1cG91dHNpZGUnLCBmKVxufVxuXG5mdW5jdGlvbiBfb25Ub3VjaCAoZSkge1xuICBsZXQgdHlwZSA9IGUudHlwZVxuICBsZXQgcHJvcGFnYXRpb24gPSBmYWxzZVxuICBzd2l0Y2ggKHR5cGUpIHtcbiAgICBjYXNlICd0b3VjaHN0YXJ0JzpcbiAgICBjYXNlICdtb3VzZWRvd24nOlxuICAgICAgdGhpcy5kcmFnID0gZS5kYXRhLmdsb2JhbC5jbG9uZSgpXG4gICAgICB0aGlzLm9yaWdpblBvc2l0aW9uID0ge1xuICAgICAgICB4OiB0aGlzLngsXG4gICAgICAgIHk6IHRoaXMueVxuICAgICAgfVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd0b3VjaGVuZCc6XG4gICAgY2FzZSAndG91Y2hlbmRvdXRzaWRlJzpcbiAgICBjYXNlICdtb3VzZXVwJzpcbiAgICBjYXNlICdtb3VzZXVwb3V0c2lkZSc6XG4gICAgICB0aGlzLmRyYWcgPSBmYWxzZVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd0b3VjaG1vdmUnOlxuICAgIGNhc2UgJ21vdXNlbW92ZSc6XG4gICAgICBpZiAoIXRoaXMuZHJhZykge1xuICAgICAgICBwcm9wYWdhdGlvbiA9IHRydWVcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIGxldCBuZXdQb2ludCA9IGUuZGF0YS5nbG9iYWwuY2xvbmUoKVxuICAgICAgdGhpcy5wb3NpdGlvbi5zZXQoXG4gICAgICAgIHRoaXMub3JpZ2luUG9zaXRpb24ueCArIG5ld1BvaW50LnggLSB0aGlzLmRyYWcueCxcbiAgICAgICAgdGhpcy5vcmlnaW5Qb3NpdGlvbi55ICsgbmV3UG9pbnQueSAtIHRoaXMuZHJhZy55XG4gICAgICApXG4gICAgICBfZmFsbGJhY2tUb0JvdW5kYXJ5LmNhbGwodGhpcylcbiAgICAgIHRoaXMuZW1pdCgnZHJhZycpIC8vIG1heWJlIGNhbiBwYXNzIHBhcmFtIGZvciBzb21lIHJlYXNvbjogZS5kYXRhLmdldExvY2FsUG9zaXRpb24odGhpcylcbiAgICAgIGJyZWFrXG4gIH1cbiAgaWYgKCFwcm9wYWdhdGlvbikge1xuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgfVxufVxuXG4vLyDpgIDlm57pgornlYxcbmZ1bmN0aW9uIF9mYWxsYmFja1RvQm91bmRhcnkgKCkge1xuICBsZXQgeyB3aWR0aCA9IHRoaXMud2lkdGgsIGhlaWdodCA9IHRoaXMuaGVpZ2h0LCBib3VuZGFyeSB9ID0gdGhpc1tPUFRdXG4gIHRoaXMueCA9IE1hdGgubWF4KHRoaXMueCwgYm91bmRhcnkueClcbiAgdGhpcy54ID0gTWF0aC5taW4odGhpcy54LCBib3VuZGFyeS54ICsgYm91bmRhcnkud2lkdGggLSB3aWR0aClcbiAgdGhpcy55ID0gTWF0aC5tYXgodGhpcy55LCBib3VuZGFyeS55KVxuICB0aGlzLnkgPSBNYXRoLm1pbih0aGlzLnksIGJvdW5kYXJ5LnkgKyBib3VuZGFyeS5oZWlnaHQgLSBoZWlnaHQpXG59XG5jbGFzcyBXcmFwcGVyIHtcbiAgLyoqXG4gICAqIGRpc3BsYXlPYmplY3Q6IHdpbGwgd3JhcHBlZCBEaXNwbGF5T2JqZWN0XG4gICAqIG9wdDoge1xuICAgKiAgYm91bmRhcnk6IOaLluabs+mCiueVjCB7IHgsIHksIHdpZHRoLCBoZWlnaHQgfVxuICAgKiAgWywgd2lkdGhdOiDpgornlYznorDmkp7lr6woZGVmYXVsdDogZGlzcGxheU9iamVjdC53aWR0aClcbiAgICogIFssIGhlaWdodF06IOmCiueVjOeisOaSnumrmChkZWZhdWx0OiBkaXNwbGF5T2JqZWN0LmhlaWdodClcbiAgICogIH1cbiAgICovXG4gIHN0YXRpYyBkcmFnZ2FibGUgKGRpc3BsYXlPYmplY3QsIG9wdCkge1xuICAgIGRpc3BsYXlPYmplY3RbT1BUXSA9IG9wdFxuICAgIF9lbmFibGVEcmFnZ2FibGUuY2FsbChkaXNwbGF5T2JqZWN0KVxuICAgIGRpc3BsYXlPYmplY3QuZmFsbGJhY2tUb0JvdW5kYXJ5ID0gX2ZhbGxiYWNrVG9Cb3VuZGFyeVxuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFdyYXBwZXJcbiJdfQ==

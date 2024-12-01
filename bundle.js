(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":4}],3:[function(require,module,exports){
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

'use strict';

var R = typeof Reflect === 'object' ? Reflect : null
var ReflectApply = R && typeof R.apply === 'function'
  ? R.apply
  : function ReflectApply(target, receiver, args) {
    return Function.prototype.apply.call(target, receiver, args);
  }

var ReflectOwnKeys
if (R && typeof R.ownKeys === 'function') {
  ReflectOwnKeys = R.ownKeys
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target)
      .concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys(target) {
    return Object.getOwnPropertyNames(target);
  };
}

function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}

var NumberIsNaN = Number.isNaN || function NumberIsNaN(value) {
  return value !== value;
}

function EventEmitter() {
  EventEmitter.init.call(this);
}
module.exports = EventEmitter;
module.exports.once = once;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

function checkListener(listener) {
  if (typeof listener !== 'function') {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}

Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== 'number' || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + '.');
    }
    defaultMaxListeners = arg;
  }
});

EventEmitter.init = function() {

  if (this._events === undefined ||
      this._events === Object.getPrototypeOf(this)._events) {
    this._events = Object.create(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || NumberIsNaN(n)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
  }
  this._maxListeners = n;
  return this;
};

function _getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};

EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
  var doError = (type === 'error');

  var events = this._events;
  if (events !== undefined)
    doError = (doError && events.error === undefined);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      // Note: The comments on the `throw` lines are intentional, they show
      // up in Node's output if this results in an unhandled exception.
      throw er; // Unhandled 'error' event
    }
    // At least give some kind of context to the user
    var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
    err.context = er;
    throw err; // Unhandled 'error' event
  }

  var handler = events[type];

  if (handler === undefined)
    return false;

  if (typeof handler === 'function') {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      ReflectApply(listeners[i], this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  checkListener(listener);

  events = target._events;
  if (events === undefined) {
    events = target._events = Object.create(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener !== undefined) {
      target.emit('newListener', type,
                  listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (existing === undefined) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
        prepend ? [listener, existing] : [existing, listener];
      // If we've already got an array, just append.
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }

    // Check for listener leak
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      // No error code for this since it is a Warning
      // eslint-disable-next-line no-restricted-syntax
      var w = new Error('Possible EventEmitter memory leak detected. ' +
                          existing.length + ' ' + String(type) + ' listeners ' +
                          'added. Use emitter.setMaxListeners() to ' +
                          'increase limit');
      w.name = 'MaxListenersExceededWarning';
      w.emitter = target;
      w.type = type;
      w.count = existing.length;
      ProcessEmitWarning(w);
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
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      checkListener(listener);
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      checkListener(listener);

      events = this._events;
      if (events === undefined)
        return this;

      list = events[type];
      if (list === undefined)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = Object.create(null);
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
        else {
          spliceOne(list, position);
        }

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener !== undefined)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.off = EventEmitter.prototype.removeListener;

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (events === undefined)
        return this;

      // not listening for removeListener, no need to emit
      if (events.removeListener === undefined) {
        if (arguments.length === 0) {
          this._events = Object.create(null);
          this._eventsCount = 0;
        } else if (events[type] !== undefined) {
          if (--this._eventsCount === 0)
            this._events = Object.create(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = Object.keys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = Object.create(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners !== undefined) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (events === undefined)
    return [];

  var evlistener = events[type];
  if (evlistener === undefined)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ?
    unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
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

  if (events !== undefined) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener !== undefined) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function once(emitter, name) {
  return new Promise(function (resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);
      reject(err);
    }

    function resolver() {
      if (typeof emitter.removeListener === 'function') {
        emitter.removeListener('error', errorListener);
      }
      resolve([].slice.call(arguments));
    };

    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
    if (name !== 'error') {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}

function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === 'function') {
    eventTargetAgnosticAddListener(emitter, 'error', handler, flags);
  }
}

function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === 'function') {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === 'function') {
    // EventTarget does not have `error` event semantics like Node
    // EventEmitters, we do not listen for `error` events here.
    emitter.addEventListener(name, function wrapListener(arg) {
      // IE does not have builtin `{ once: true }` support so we
      // have to do it manually.
      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }
      listener(arg);
    });
  } else {
    throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}

},{}],4:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],5:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],6:[function(require,module,exports){
(function (process){(function (){
const { RTVIClient } = require('realtime-ai');
const { DailyTransport } = require('@daily-co/realtime-ai-daily');

function myTrackHandler(track, participant) {
  if (participant.local || track.kind !== "audio") {
    return;
  }
  let audioElement = document.createElement("audio");
  audioElement.srcObject = new MediaStream([track]);
  document.body.appendChild(audioElement);
  audioElement.play();
}

const rtviClient = new RTVIClient({
  params: {
    baseUrl: process.env.BASE_URL || "/api",
  },
  transport: new DailyTransport(),
  enableMic: true,
  callbacks: {
    onTrackStart: myTrackHandler,
  },
});

rtviClient.connect();

// Exportez ce dont vous pourriez avoir besoin
module.exports = {
  RTVIClient,
  DailyTransport,
  rtviClient
};
}).call(this)}).call(this,require('_process'))
},{"@daily-co/realtime-ai-daily":8,"_process":5,"realtime-ai":13}],7:[function(require,module,exports){
(function (process){(function (){
!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.Daily=t():e.Daily=t()}(this,(function(){return function(){var e={518:function(e,t,n){"use strict";function r(){return"undefined"!=typeof __SENTRY_BROWSER_BUNDLE__&&!!__SENTRY_BROWSER_BUNDLE__}function i(){return"npm"}n.d(t,{S:function(){return i},n:function(){return r}})},422:function(e,t,n){"use strict";n.d(t,{KV:function(){return i},l$:function(){return o}});var r=n(518);function i(){return!(0,r.n)()&&"[object process]"===Object.prototype.toString.call("undefined"!=typeof process?process:0)}function o(e,t){return e.require(t)}e=n.hmd(e)},170:function(e,t,n){"use strict";n.d(t,{ph:function(){return l},yW:function(){return u}});var r=n(422),i=n(235);e=n.hmd(e);const o=(0,i.Rf)(),a={nowSeconds:()=>Date.now()/1e3},s=(0,r.KV)()?function(){try{return(0,r.l$)(e,"perf_hooks").performance}catch(e){return}}():function(){const{performance:e}=o;if(e&&e.now)return{now:()=>e.now(),timeOrigin:Date.now()-e.now()}}(),c=void 0===s?a:{nowSeconds:()=>(s.timeOrigin+s.now())/1e3},u=a.nowSeconds.bind(a),l=c.nowSeconds.bind(c);let d;(()=>{const{performance:e}=o;if(!e||!e.now)return void(d="none");const t=36e5,n=e.now(),r=Date.now(),i=e.timeOrigin?Math.abs(e.timeOrigin+n-r):t,a=i<t,s=e.timing&&e.timing.navigationStart,c="number"==typeof s?Math.abs(s+n-r):t;a||c<t?i<=c?(d="timeOrigin",e.timeOrigin):d="navigationStart":d="dateNow"})()},235:function(e,t,n){"use strict";function r(e){return e&&e.Math==Math?e:void 0}n.d(t,{Rf:function(){return o},YO:function(){return a},n2:function(){return i}});const i="object"==typeof globalThis&&r(globalThis)||"object"==typeof window&&r(window)||"object"==typeof self&&r(self)||"object"==typeof window&&r(window)||function(){return this}()||{};function o(){return i}function a(e,t,n){const r=n||i,o=r.__SENTRY__=r.__SENTRY__||{};return o[e]||(o[e]=t())}},880:function(e,t,n){var r=n(123);e.exports=r.default},123:function(e,t,n){"use strict";n.r(t),n.d(t,{DAILY_ACCESS_LEVEL_FULL:function(){return Hn},DAILY_ACCESS_LEVEL_LOBBY:function(){return Kn},DAILY_ACCESS_LEVEL_NONE:function(){return Qn},DAILY_ACCESS_UNKNOWN:function(){return zn},DAILY_CAMERA_ERROR_CAM_AND_MIC_IN_USE:function(){return fr},DAILY_CAMERA_ERROR_CAM_IN_USE:function(){return lr},DAILY_CAMERA_ERROR_CONSTRAINTS:function(){return _r},DAILY_CAMERA_ERROR_MIC_IN_USE:function(){return dr},DAILY_CAMERA_ERROR_NOT_FOUND:function(){return vr},DAILY_CAMERA_ERROR_PERMISSIONS:function(){return hr},DAILY_CAMERA_ERROR_UNDEF_MEDIADEVICES:function(){return pr},DAILY_CAMERA_ERROR_UNKNOWN:function(){return gr},DAILY_EVENT_ACCESS_STATE_UPDATED:function(){return Lr},DAILY_EVENT_ACTIVE_SPEAKER_CHANGE:function(){return oi},DAILY_EVENT_ACTIVE_SPEAKER_MODE_CHANGE:function(){return ai},DAILY_EVENT_APP_MSG:function(){return Qr},DAILY_EVENT_CAMERA_ERROR:function(){return Tr},DAILY_EVENT_CPU_LOAD_CHANGE:function(){return ui},DAILY_EVENT_ERROR:function(){return Si},DAILY_EVENT_EXIT_FULLSCREEN:function(){return fi},DAILY_EVENT_FACE_COUNTS_UPDATED:function(){return li},DAILY_EVENT_FULLSCREEN:function(){return di},DAILY_EVENT_IFRAME_LAUNCH_CONFIG:function(){return yr},DAILY_EVENT_IFRAME_READY_FOR_LAUNCH_CONFIG:function(){return mr},DAILY_EVENT_INPUT_SETTINGS_UPDATED:function(){return yi},DAILY_EVENT_JOINED_MEETING:function(){return Cr},DAILY_EVENT_JOINING_MEETING:function(){return Mr},DAILY_EVENT_LANG_UPDATED:function(){return gi},DAILY_EVENT_LEFT_MEETING:function(){return Ar},DAILY_EVENT_LIVE_STREAMING_ERROR:function(){return _i},DAILY_EVENT_LIVE_STREAMING_STARTED:function(){return hi},DAILY_EVENT_LIVE_STREAMING_STOPPED:function(){return vi},DAILY_EVENT_LIVE_STREAMING_UPDATED:function(){return pi},DAILY_EVENT_LOADED:function(){return wr},DAILY_EVENT_LOADING:function(){return Sr},DAILY_EVENT_LOAD_ATTEMPT_FAILED:function(){return Er},DAILY_EVENT_LOCAL_SCREEN_SHARE_CANCELED:function(){return ii},DAILY_EVENT_LOCAL_SCREEN_SHARE_STARTED:function(){return ni},DAILY_EVENT_LOCAL_SCREEN_SHARE_STOPPED:function(){return ri},DAILY_EVENT_MEETING_SESSION_DATA_ERROR:function(){return xr},DAILY_EVENT_MEETING_SESSION_STATE_UPDATED:function(){return Rr},DAILY_EVENT_MEETING_SESSION_SUMMARY_UPDATED:function(){return Nr},DAILY_EVENT_NETWORK_CONNECTION:function(){return ci},DAILY_EVENT_NETWORK_QUALITY_CHANGE:function(){return si},DAILY_EVENT_NONFATAL_ERROR:function(){return bi},DAILY_EVENT_PARTICIPANT_COUNTS_UPDATED:function(){return Ir},DAILY_EVENT_PARTICIPANT_JOINED:function(){return Or},DAILY_EVENT_PARTICIPANT_LEFT:function(){return Dr},DAILY_EVENT_PARTICIPANT_UPDATED:function(){return Pr},DAILY_EVENT_RECEIVE_SETTINGS_UPDATED:function(){return mi},DAILY_EVENT_RECORDING_DATA:function(){return Kr},DAILY_EVENT_RECORDING_ERROR:function(){return zr},DAILY_EVENT_RECORDING_STARTED:function(){return $r},DAILY_EVENT_RECORDING_STATS:function(){return Wr},DAILY_EVENT_RECORDING_STOPPED:function(){return qr},DAILY_EVENT_RECORDING_UPLOAD_COMPLETED:function(){return Hr},DAILY_EVENT_REMOTE_MEDIA_PLAYER_STARTED:function(){return Zr},DAILY_EVENT_REMOTE_MEDIA_PLAYER_STOPPED:function(){return ti},DAILY_EVENT_REMOTE_MEDIA_PLAYER_UPDATED:function(){return ei},DAILY_EVENT_STARTED_CAMERA:function(){return kr},DAILY_EVENT_THEME_UPDATED:function(){return br},DAILY_EVENT_TRACK_STARTED:function(){return Ur},DAILY_EVENT_TRACK_STOPPED:function(){return Vr},DAILY_EVENT_TRANSCRIPTION_ERROR:function(){return Jr},DAILY_EVENT_TRANSCRIPTION_MSG:function(){return Xr},DAILY_EVENT_TRANSCRIPTION_STARTED:function(){return Yr},DAILY_EVENT_TRANSCRIPTION_STOPPED:function(){return Gr},DAILY_EVENT_WAITING_PARTICIPANT_ADDED:function(){return jr},DAILY_EVENT_WAITING_PARTICIPANT_REMOVED:function(){return Br},DAILY_EVENT_WAITING_PARTICIPANT_UPDATED:function(){return Fr},DAILY_FATAL_ERROR_CONNECTION:function(){return ur},DAILY_FATAL_ERROR_EJECTED:function(){return er},DAILY_FATAL_ERROR_EOL:function(){return sr},DAILY_FATAL_ERROR_EXP_ROOM:function(){return rr},DAILY_FATAL_ERROR_EXP_TOKEN:function(){return ir},DAILY_FATAL_ERROR_MEETING_FULL:function(){return ar},DAILY_FATAL_ERROR_NBF_ROOM:function(){return tr},DAILY_FATAL_ERROR_NBF_TOKEN:function(){return nr},DAILY_FATAL_ERROR_NOT_ALLOWED:function(){return cr},DAILY_FATAL_ERROR_NO_ROOM:function(){return or},DAILY_RECEIVE_SETTINGS_ALL_PARTICIPANTS_KEY:function(){return Zn},DAILY_RECEIVE_SETTINGS_BASE_KEY:function(){return Xn},DAILY_STATE_ERROR:function(){return Vn},DAILY_STATE_JOINED:function(){return Bn},DAILY_STATE_JOINING:function(){return Fn},DAILY_STATE_LEFT:function(){return Un},DAILY_STATE_NEW:function(){return Rn},DAILY_TRACK_STATE_BLOCKED:function(){return Yn},DAILY_TRACK_STATE_INTERRUPTED:function(){return qn},DAILY_TRACK_STATE_LOADING:function(){return $n},DAILY_TRACK_STATE_OFF:function(){return Gn},DAILY_TRACK_STATE_PLAYABLE:function(){return Wn},DAILY_TRACK_STATE_SENDABLE:function(){return Jn},default:function(){return na}});var r={};n.r(r),n.d(r,{FunctionToString:function(){return on},InboundFilters:function(){return cn}});var i={};function o(e,t){if(null==e)return{};var n,r,i=function(e,t){if(null==e)return{};var n,r,i={},o=Object.keys(e);for(r=0;r<o.length;r++)n=o[r],t.indexOf(n)>=0||(i[n]=e[n]);return i}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(r=0;r<o.length;r++)n=o[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(i[n]=e[n])}return i}function a(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function s(e){return s="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},s(e)}function c(e){var t=function(e,t){if("object"!==s(e)||null===e)return e;var n=e[Symbol.toPrimitive];if(void 0!==n){var r=n.call(e,"string");if("object"!==s(r))return r;throw new TypeError("@@toPrimitive must return a primitive value.")}return String(e)}(e);return"symbol"===s(t)?t:String(t)}function u(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,c(r.key),r)}}function l(e,t,n){return t&&u(e.prototype,t),n&&u(e,n),Object.defineProperty(e,"prototype",{writable:!1}),e}function d(e){if(void 0===e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return e}function f(e,t){return f=Object.setPrototypeOf?Object.setPrototypeOf.bind():function(e,t){return e.__proto__=t,e},f(e,t)}function h(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function");e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,writable:!0,configurable:!0}}),Object.defineProperty(e,"prototype",{writable:!1}),t&&f(e,t)}function p(e,t){if(t&&("object"===s(t)||"function"==typeof t))return t;if(void 0!==t)throw new TypeError("Derived constructors may only return object or undefined");return d(e)}function v(e){return v=Object.setPrototypeOf?Object.getPrototypeOf.bind():function(e){return e.__proto__||Object.getPrototypeOf(e)},v(e)}function _(e,t,n){return(t=c(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function g(e,t,n,r,i,o,a){try{var s=e[o](a),c=s.value}catch(e){return void n(e)}s.done?t(c):Promise.resolve(c).then(r,i)}function m(e){return function(){var t=this,n=arguments;return new Promise((function(r,i){var o=e.apply(t,n);function a(e){g(o,r,i,a,s,"next",e)}function s(e){g(o,r,i,a,s,"throw",e)}a(void 0)}))}}function y(e,t){(null==t||t>e.length)&&(t=e.length);for(var n=0,r=new Array(t);n<t;n++)r[n]=e[n];return r}function b(e,t){return function(e){if(Array.isArray(e))return e}(e)||function(e,t){var n=null==e?null:"undefined"!=typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(null!=n){var r,i,o,a,s=[],c=!0,u=!1;try{if(o=(n=n.call(e)).next,0===t){if(Object(n)!==n)return;c=!1}else for(;!(c=(r=o.call(n)).done)&&(s.push(r.value),s.length!==t);c=!0);}catch(e){u=!0,i=e}finally{try{if(!c&&null!=n.return&&(a=n.return(),Object(a)!==a))return}finally{if(u)throw i}}return s}}(e,t)||function(e,t){if(e){if("string"==typeof e)return y(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);return"Object"===n&&e.constructor&&(n=e.constructor.name),"Map"===n||"Set"===n?Array.from(e):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?y(e,t):void 0}}(e,t)||function(){throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}n.r(i),n.d(i,{Breadcrumbs:function(){return $t},Dedupe:function(){return An},GlobalHandlers:function(){return ln},HttpContext:function(){return Cn},LinkedErrors:function(){return Mn},TryCatch:function(){return gn}});var S=n(187),E=n.n(S),w=Object.prototype.hasOwnProperty;function k(e,t,n){for(n of e.keys())if(T(n,t))return n}function T(e,t){var n,r,i;if(e===t)return!0;if(e&&t&&(n=e.constructor)===t.constructor){if(n===Date)return e.getTime()===t.getTime();if(n===RegExp)return e.toString()===t.toString();if(n===Array){if((r=e.length)===t.length)for(;r--&&T(e[r],t[r]););return-1===r}if(n===Set){if(e.size!==t.size)return!1;for(r of e){if((i=r)&&"object"==typeof i&&!(i=k(t,i)))return!1;if(!t.has(i))return!1}return!0}if(n===Map){if(e.size!==t.size)return!1;for(r of e){if((i=r[0])&&"object"==typeof i&&!(i=k(t,i)))return!1;if(!T(r[1],t.get(i)))return!1}return!0}if(n===ArrayBuffer)e=new Uint8Array(e),t=new Uint8Array(t);else if(n===DataView){if((r=e.byteLength)===t.byteLength)for(;r--&&e.getInt8(r)===t.getInt8(r););return-1===r}if(ArrayBuffer.isView(e)){if((r=e.byteLength)===t.byteLength)for(;r--&&e[r]===t[r];);return-1===r}if(!n||"object"==typeof e){for(n in r=0,e){if(w.call(e,n)&&++r&&!w.call(t,n))return!1;if(!(n in t)||!T(e[n],t[n]))return!1}return Object.keys(t).length===r}}return e!=e&&t!=t}var M=n(206),C=n.n(M);function A(){return Date.now()+Math.random().toString()}function O(){throw new Error("Method must be implemented in subclass")}function P(e,t){return null!=t&&t.proxyUrl?t.proxyUrl+("/"===t.proxyUrl.slice(-1)?"":"/")+e.substring(8):e}function D(e){return null!=e&&e.callObjectBundleUrlOverride?e.callObjectBundleUrlOverride:P("https://c.daily.co/call-machine/versioned/".concat("0.72.2","/static/call-machine-object-bundle.js"),e)}function I(e){try{new URL(e)}catch(e){return!1}return!0}var L=n(235);const N=["debug","info","warn","error","log","assert","trace"];function R(e){if(!("console"in L.n2))return e();const t=L.n2.console,n={};N.forEach((e=>{const r=t[e]&&t[e].__sentry_original__;e in t&&r&&(n[e]=t[e],t[e]=r)}));try{return e()}finally{Object.keys(n).forEach((e=>{t[e]=n[e]}))}}function x(){let e=!1;const t={enable:()=>{e=!0},disable:()=>{e=!1}};return"undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__?N.forEach((n=>{t[n]=(...t)=>{e&&R((()=>{L.n2.console[n](`Sentry Logger [${n}]:`,...t)}))}})):N.forEach((e=>{t[e]=()=>{}})),t}let j;j="undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__?(0,L.YO)("logger",x):x();const F=/^(?:(\w+):)\/\/(?:(\w+)(?::(\w+)?)?@)([\w.-]+)(?::(\d+))?\/(.+)/;function B(e,t=!1){const{host:n,path:r,pass:i,port:o,projectId:a,protocol:s,publicKey:c}=e;return`${s}://${c}${t&&i?`:${i}`:""}@${n}${o?`:${o}`:""}/${r?`${r}/`:r}${a}`}function U(e){return{protocol:e.protocol,publicKey:e.publicKey||"",pass:e.pass||"",host:e.host,port:e.port||"",path:e.path||"",projectId:e.projectId}}const V=Object.prototype.toString;function Y(e){switch(V.call(e)){case"[object Error]":case"[object Exception]":case"[object DOMException]":return!0;default:return Q(e,Error)}}function G(e,t){return V.call(e)===`[object ${t}]`}function J(e){return G(e,"ErrorEvent")}function $(e){return G(e,"DOMError")}function q(e){return G(e,"String")}function W(e){return null===e||"object"!=typeof e&&"function"!=typeof e}function z(e){return G(e,"Object")}function H(e){return"undefined"!=typeof Event&&Q(e,Event)}function K(e){return Boolean(e&&e.then&&"function"==typeof e.then)}function Q(e,t){try{return e instanceof t}catch(e){return!1}}const X=(0,L.Rf)(),Z=80;function ee(e,t={}){try{let n=e;const r=5,i=[];let o=0,a=0;const s=" > ",c=s.length;let u;const l=Array.isArray(t)?t:t.keyAttrs,d=!Array.isArray(t)&&t.maxStringLength||Z;for(;n&&o++<r&&(u=te(n,l),!("html"===u||o>1&&a+i.length*c+u.length>=d));)i.push(u),a+=u.length,n=n.parentNode;return i.reverse().join(s)}catch(e){return"<unknown>"}}function te(e,t){const n=e,r=[];let i,o,a,s,c;if(!n||!n.tagName)return"";r.push(n.tagName.toLowerCase());const u=t&&t.length?t.filter((e=>n.getAttribute(e))).map((e=>[e,n.getAttribute(e)])):null;if(u&&u.length)u.forEach((e=>{r.push(`[${e[0]}="${e[1]}"]`)}));else if(n.id&&r.push(`#${n.id}`),i=n.className,i&&q(i))for(o=i.split(/\s+/),c=0;c<o.length;c++)r.push(`.${o[c]}`);const l=["aria-label","type","name","title","alt"];for(c=0;c<l.length;c++)a=l[c],s=n.getAttribute(a),s&&r.push(`[${a}="${s}"]`);return r.join("")}function ne(e,t=0){return"string"!=typeof e||0===t||e.length<=t?e:`${e.slice(0,t)}...`}function re(e,t){if(!Array.isArray(e))return"";const n=[];for(let t=0;t<e.length;t++){const r=e[t];try{n.push(String(r))}catch(e){n.push("[value cannot be serialized]")}}return n.join(t)}function ie(e,t=[],n=!1){return t.some((t=>function(e,t,n=!1){return!!q(e)&&(G(t,"RegExp")?t.test(e):!!q(t)&&(n?e===t:e.includes(t)))}(e,t,n)))}function oe(e,t,n){if(!(t in e))return;const r=e[t],i=n(r);if("function"==typeof i)try{se(i,r)}catch(e){}e[t]=i}function ae(e,t,n){Object.defineProperty(e,t,{value:n,writable:!0,configurable:!0})}function se(e,t){const n=t.prototype||{};e.prototype=t.prototype=n,ae(e,"__sentry_original__",t)}function ce(e){return e.__sentry_original__}function ue(e){if(Y(e))return{message:e.message,name:e.name,stack:e.stack,...de(e)};if(H(e)){const t={type:e.type,target:le(e.target),currentTarget:le(e.currentTarget),...de(e)};return"undefined"!=typeof CustomEvent&&Q(e,CustomEvent)&&(t.detail=e.detail),t}return e}function le(e){try{return"undefined"!=typeof Element&&Q(e,Element)?ee(e):Object.prototype.toString.call(e)}catch(e){return"<unknown>"}}function de(e){if("object"==typeof e&&null!==e){const t={};for(const n in e)Object.prototype.hasOwnProperty.call(e,n)&&(t[n]=e[n]);return t}return{}}function fe(e){return he(e,new Map)}function he(e,t){if(z(e)){const n=t.get(e);if(void 0!==n)return n;const r={};t.set(e,r);for(const n of Object.keys(e))void 0!==e[n]&&(r[n]=he(e[n],t));return r}if(Array.isArray(e)){const n=t.get(e);if(void 0!==n)return n;const r=[];return t.set(e,r),e.forEach((e=>{r.push(he(e,t))})),r}return e}function pe(){const e=L.n2,t=e.crypto||e.msCrypto;if(t&&t.randomUUID)return t.randomUUID().replace(/-/g,"");const n=t&&t.getRandomValues?()=>t.getRandomValues(new Uint8Array(1))[0]:()=>16*Math.random();return([1e7]+1e3+4e3+8e3+1e11).replace(/[018]/g,(e=>(e^(15&n())>>e/4).toString(16)))}function ve(e){return e.exception&&e.exception.values?e.exception.values[0]:void 0}function _e(e){const{message:t,event_id:n}=e;if(t)return t;const r=ve(e);return r?r.type&&r.value?`${r.type}: ${r.value}`:r.type||r.value||n||"<unknown>":n||"<unknown>"}function ge(e,t,n){const r=e.exception=e.exception||{},i=r.values=r.values||[],o=i[0]=i[0]||{};o.value||(o.value=t||""),o.type||(o.type=n||"Error")}function me(e,t){const n=ve(e);if(!n)return;const r=n.mechanism;if(n.mechanism={type:"generic",handled:!0,...r,...t},t&&"data"in t){const e={...r&&r.data,...t.data};n.mechanism.data=e}}function ye(e){if(e&&e.__sentry_captured__)return!0;try{ae(e,"__sentry_captured__",!0)}catch(e){}return!1}var be;function Se(e){return new we((t=>{t(e)}))}function Ee(e){return new we(((t,n)=>{n(e)}))}!function(e){e[e.PENDING=0]="PENDING",e[e.RESOLVED=1]="RESOLVED",e[e.REJECTED=2]="REJECTED"}(be||(be={}));class we{__init(){this._state=be.PENDING}__init2(){this._handlers=[]}constructor(e){we.prototype.__init.call(this),we.prototype.__init2.call(this),we.prototype.__init3.call(this),we.prototype.__init4.call(this),we.prototype.__init5.call(this),we.prototype.__init6.call(this);try{e(this._resolve,this._reject)}catch(e){this._reject(e)}}then(e,t){return new we(((n,r)=>{this._handlers.push([!1,t=>{if(e)try{n(e(t))}catch(e){r(e)}else n(t)},e=>{if(t)try{n(t(e))}catch(e){r(e)}else r(e)}]),this._executeHandlers()}))}catch(e){return this.then((e=>e),e)}finally(e){return new we(((t,n)=>{let r,i;return this.then((t=>{i=!1,r=t,e&&e()}),(t=>{i=!0,r=t,e&&e()})).then((()=>{i?n(r):t(r)}))}))}__init3(){this._resolve=e=>{this._setResult(be.RESOLVED,e)}}__init4(){this._reject=e=>{this._setResult(be.REJECTED,e)}}__init5(){this._setResult=(e,t)=>{this._state===be.PENDING&&(K(t)?t.then(this._resolve,this._reject):(this._state=e,this._value=t,this._executeHandlers()))}}__init6(){this._executeHandlers=()=>{if(this._state===be.PENDING)return;const e=this._handlers.slice();this._handlers=[],e.forEach((e=>{e[0]||(this._state===be.RESOLVED&&e[1](this._value),this._state===be.REJECTED&&e[2](this._value),e[0]=!0)}))}}}const ke="<anonymous>";function Te(e){try{return e&&"function"==typeof e&&e.name||ke}catch(e){return ke}}function Me(e,t=100,n=1/0){try{return Ae("",e,t,n)}catch(e){return{ERROR:`**non-serializable** (${e})`}}}function Ce(e,t=3,n=102400){const r=Me(e,t);return i=r,function(e){return~-encodeURI(e).split(/%..|./).length}(JSON.stringify(i))>n?Ce(e,t-1,n):r;var i}function Ae(e,t,n=1/0,r=1/0,i=function(){const e="function"==typeof WeakSet,t=e?new WeakSet:[];return[function(n){if(e)return!!t.has(n)||(t.add(n),!1);for(let e=0;e<t.length;e++)if(t[e]===n)return!0;return t.push(n),!1},function(n){if(e)t.delete(n);else for(let e=0;e<t.length;e++)if(t[e]===n){t.splice(e,1);break}}]}()){const[o,a]=i;if(null==t||["number","boolean","string"].includes(typeof t)&&("number"!=typeof(s=t)||s==s))return t;var s;const c=function(e,t){try{if("domain"===e&&t&&"object"==typeof t&&t._events)return"[Domain]";if("domainEmitter"===e)return"[DomainEmitter]";if("undefined"!=typeof window&&t===window)return"[Global]";if("undefined"!=typeof window&&t===window)return"[Window]";if("undefined"!=typeof document&&t===document)return"[Document]";if(function(e){return z(e)&&"nativeEvent"in e&&"preventDefault"in e&&"stopPropagation"in e}(t))return"[SyntheticEvent]";if("number"==typeof t&&t!=t)return"[NaN]";if("function"==typeof t)return`[Function: ${Te(t)}]`;if("symbol"==typeof t)return`[${String(t)}]`;if("bigint"==typeof t)return`[BigInt: ${String(t)}]`;const n=function(e){const t=Object.getPrototypeOf(e);return t?t.constructor.name:"null prototype"}(t);return/^HTML(\w*)Element$/.test(n)?`[HTMLElement: ${n}]`:`[object ${n}]`}catch(e){return`**non-serializable** (${e})`}}(e,t);if(!c.startsWith("[object "))return c;if(t.__sentry_skip_normalization__)return t;const u="number"==typeof t.__sentry_override_normalization_depth__?t.__sentry_override_normalization_depth__:n;if(0===u)return c.replace("object ","");if(o(t))return"[Circular ~]";const l=t;if(l&&"function"==typeof l.toJSON)try{return Ae("",l.toJSON(),u-1,r,i)}catch(e){}const d=Array.isArray(t)?[]:{};let f=0;const h=ue(t);for(const e in h){if(!Object.prototype.hasOwnProperty.call(h,e))continue;if(f>=r){d[e]="[MaxProperties ~]";break}const t=h[e];d[e]=Ae(e,t,u-1,r,i),f++}return a(t),d}function Oe(e,t=[]){return[e,t]}function Pe(e,t){const[n,r]=e;return[n,[...r,t]]}function De(e,t){const n=e[1];for(const e of n)if(t(e,e[0].type))return!0;return!1}function Ie(e,t){return(t||new TextEncoder).encode(e)}function Le(e,t){const[n,r]=e;let i=JSON.stringify(n);function o(e){"string"==typeof i?i="string"==typeof e?i+e:[Ie(i,t),e]:i.push("string"==typeof e?Ie(e,t):e)}for(const e of r){const[t,n]=e;if(o(`\n${JSON.stringify(t)}\n`),"string"==typeof n||n instanceof Uint8Array)o(n);else{let e;try{e=JSON.stringify(n)}catch(t){e=JSON.stringify(Me(n))}o(e)}}return"string"==typeof i?i:function(e){const t=e.reduce(((e,t)=>e+t.length),0),n=new Uint8Array(t);let r=0;for(const t of e)n.set(t,r),r+=t.length;return n}(i)}function Ne(e,t){const n="string"==typeof e.data?Ie(e.data,t):e.data;return[fe({type:"attachment",length:n.length,filename:e.filename,content_type:e.contentType,attachment_type:e.attachmentType}),n]}const Re={session:"session",sessions:"session",attachment:"attachment",transaction:"transaction",event:"error",client_report:"internal",user_report:"default",profile:"profile",replay_event:"replay",replay_recording:"replay",check_in:"monitor"};function xe(e){return Re[e]}function je(e){if(!e||!e.sdk)return;const{name:t,version:n}=e.sdk;return{name:t,version:n}}class Fe extends Error{constructor(e,t="warn"){super(e),this.message=e,this.name=new.target.prototype.constructor.name,Object.setPrototypeOf(this,new.target.prototype),this.logLevel=t}}const Be="7";function Ue(e,t={}){const n="string"==typeof t?t:t.tunnel,r="string"!=typeof t&&t._metadata?t._metadata.sdk:void 0;return n||`${function(e){return`${function(e){const t=e.protocol?`${e.protocol}:`:"",n=e.port?`:${e.port}`:"";return`${t}//${e.host}${n}${e.path?`/${e.path}`:""}/api/`}(e)}${e.projectId}/envelope/`}(e)}?${function(e,t){return n={sentry_key:e.publicKey,sentry_version:Be,...t&&{sentry_client:`${t.name}/${t.version}`}},Object.keys(n).map((e=>`${encodeURIComponent(e)}=${encodeURIComponent(n[e])}`)).join("&");var n}(e,r)}`}var Ve=n(170);const Ye="production";function Ge(e,t={}){if(t.user&&(!e.ipAddress&&t.user.ip_address&&(e.ipAddress=t.user.ip_address),e.did||t.did||(e.did=t.user.id||t.user.email||t.user.username)),e.timestamp=t.timestamp||(0,Ve.ph)(),t.ignoreDuration&&(e.ignoreDuration=t.ignoreDuration),t.sid&&(e.sid=32===t.sid.length?t.sid:pe()),void 0!==t.init&&(e.init=t.init),!e.did&&t.did&&(e.did=`${t.did}`),"number"==typeof t.started&&(e.started=t.started),e.ignoreDuration)e.duration=void 0;else if("number"==typeof t.duration)e.duration=t.duration;else{const t=e.timestamp-e.started;e.duration=t>=0?t:0}t.release&&(e.release=t.release),t.environment&&(e.environment=t.environment),!e.ipAddress&&t.ipAddress&&(e.ipAddress=t.ipAddress),!e.userAgent&&t.userAgent&&(e.userAgent=t.userAgent),"number"==typeof t.errors&&(e.errors=t.errors),t.status&&(e.status=t.status)}class Je{constructor(){this._notifyingListeners=!1,this._scopeListeners=[],this._eventProcessors=[],this._breadcrumbs=[],this._attachments=[],this._user={},this._tags={},this._extra={},this._contexts={},this._sdkProcessingMetadata={},this._propagationContext=We()}static clone(e){const t=new Je;return e&&(t._breadcrumbs=[...e._breadcrumbs],t._tags={...e._tags},t._extra={...e._extra},t._contexts={...e._contexts},t._user=e._user,t._level=e._level,t._span=e._span,t._session=e._session,t._transactionName=e._transactionName,t._fingerprint=e._fingerprint,t._eventProcessors=[...e._eventProcessors],t._requestSession=e._requestSession,t._attachments=[...e._attachments],t._sdkProcessingMetadata={...e._sdkProcessingMetadata},t._propagationContext={...e._propagationContext}),t}addScopeListener(e){this._scopeListeners.push(e)}addEventProcessor(e){return this._eventProcessors.push(e),this}setUser(e){return this._user=e||{},this._session&&Ge(this._session,{user:e}),this._notifyScopeListeners(),this}getUser(){return this._user}getRequestSession(){return this._requestSession}setRequestSession(e){return this._requestSession=e,this}setTags(e){return this._tags={...this._tags,...e},this._notifyScopeListeners(),this}setTag(e,t){return this._tags={...this._tags,[e]:t},this._notifyScopeListeners(),this}setExtras(e){return this._extra={...this._extra,...e},this._notifyScopeListeners(),this}setExtra(e,t){return this._extra={...this._extra,[e]:t},this._notifyScopeListeners(),this}setFingerprint(e){return this._fingerprint=e,this._notifyScopeListeners(),this}setLevel(e){return this._level=e,this._notifyScopeListeners(),this}setTransactionName(e){return this._transactionName=e,this._notifyScopeListeners(),this}setContext(e,t){return null===t?delete this._contexts[e]:this._contexts[e]=t,this._notifyScopeListeners(),this}setSpan(e){return this._span=e,this._notifyScopeListeners(),this}getSpan(){return this._span}getTransaction(){const e=this.getSpan();return e&&e.transaction}setSession(e){return e?this._session=e:delete this._session,this._notifyScopeListeners(),this}getSession(){return this._session}update(e){if(!e)return this;if("function"==typeof e){const t=e(this);return t instanceof Je?t:this}return e instanceof Je?(this._tags={...this._tags,...e._tags},this._extra={...this._extra,...e._extra},this._contexts={...this._contexts,...e._contexts},e._user&&Object.keys(e._user).length&&(this._user=e._user),e._level&&(this._level=e._level),e._fingerprint&&(this._fingerprint=e._fingerprint),e._requestSession&&(this._requestSession=e._requestSession),e._propagationContext&&(this._propagationContext=e._propagationContext)):z(e)&&(this._tags={...this._tags,...e.tags},this._extra={...this._extra,...e.extra},this._contexts={...this._contexts,...e.contexts},e.user&&(this._user=e.user),e.level&&(this._level=e.level),e.fingerprint&&(this._fingerprint=e.fingerprint),e.requestSession&&(this._requestSession=e.requestSession),e.propagationContext&&(this._propagationContext=e.propagationContext)),this}clear(){return this._breadcrumbs=[],this._tags={},this._extra={},this._user={},this._contexts={},this._level=void 0,this._transactionName=void 0,this._fingerprint=void 0,this._requestSession=void 0,this._span=void 0,this._session=void 0,this._notifyScopeListeners(),this._attachments=[],this._propagationContext=We(),this}addBreadcrumb(e,t){const n="number"==typeof t?t:100;if(n<=0)return this;const r={timestamp:(0,Ve.yW)(),...e};return this._breadcrumbs=[...this._breadcrumbs,r].slice(-n),this._notifyScopeListeners(),this}getLastBreadcrumb(){return this._breadcrumbs[this._breadcrumbs.length-1]}clearBreadcrumbs(){return this._breadcrumbs=[],this._notifyScopeListeners(),this}addAttachment(e){return this._attachments.push(e),this}getAttachments(){return this._attachments}clearAttachments(){return this._attachments=[],this}applyToEvent(e,t={}){if(this._extra&&Object.keys(this._extra).length&&(e.extra={...this._extra,...e.extra}),this._tags&&Object.keys(this._tags).length&&(e.tags={...this._tags,...e.tags}),this._user&&Object.keys(this._user).length&&(e.user={...this._user,...e.user}),this._contexts&&Object.keys(this._contexts).length&&(e.contexts={...this._contexts,...e.contexts}),this._level&&(e.level=this._level),this._transactionName&&(e.transaction=this._transactionName),this._span){e.contexts={trace:this._span.getTraceContext(),...e.contexts};const t=this._span.transaction;if(t){e.sdkProcessingMetadata={dynamicSamplingContext:t.getDynamicSamplingContext(),...e.sdkProcessingMetadata};const n=t.name;n&&(e.tags={transaction:n,...e.tags})}}return this._applyFingerprint(e),e.breadcrumbs=[...e.breadcrumbs||[],...this._breadcrumbs],e.breadcrumbs=e.breadcrumbs.length>0?e.breadcrumbs:void 0,e.sdkProcessingMetadata={...e.sdkProcessingMetadata,...this._sdkProcessingMetadata,propagationContext:this._propagationContext},this._notifyEventProcessors([...$e(),...this._eventProcessors],e,t)}setSDKProcessingMetadata(e){return this._sdkProcessingMetadata={...this._sdkProcessingMetadata,...e},this}setPropagationContext(e){return this._propagationContext=e,this}getPropagationContext(){return this._propagationContext}_notifyEventProcessors(e,t,n,r=0){return new we(((i,o)=>{const a=e[r];if(null===t||"function"!=typeof a)i(t);else{const s=a({...t},n);("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&a.id&&null===s&&j.log(`Event processor "${a.id}" dropped event`),K(s)?s.then((t=>this._notifyEventProcessors(e,t,n,r+1).then(i))).then(null,o):this._notifyEventProcessors(e,s,n,r+1).then(i).then(null,o)}}))}_notifyScopeListeners(){this._notifyingListeners||(this._notifyingListeners=!0,this._scopeListeners.forEach((e=>{e(this)})),this._notifyingListeners=!1)}_applyFingerprint(e){var t;e.fingerprint=e.fingerprint?(t=e.fingerprint,Array.isArray(t)?t:[t]):[],this._fingerprint&&(e.fingerprint=e.fingerprint.concat(this._fingerprint)),e.fingerprint&&!e.fingerprint.length&&delete e.fingerprint}}function $e(){return(0,L.YO)("globalEventProcessors",(()=>[]))}function qe(e){$e().push(e)}function We(){return{traceId:pe(),spanId:pe().substring(16),sampled:!1}}const ze=4,He=100;class Ke{constructor(e,t=new Je,n=ze){this._version=n,this._stack=[{scope:t}],e&&this.bindClient(e)}isOlderThan(e){return this._version<e}bindClient(e){this.getStackTop().client=e,e&&e.setupIntegrations&&e.setupIntegrations()}pushScope(){const e=Je.clone(this.getScope());return this.getStack().push({client:this.getClient(),scope:e}),e}popScope(){return!(this.getStack().length<=1||!this.getStack().pop())}withScope(e){const t=this.pushScope();try{e(t)}finally{this.popScope()}}getClient(){return this.getStackTop().client}getScope(){return this.getStackTop().scope}getStack(){return this._stack}getStackTop(){return this._stack[this._stack.length-1]}captureException(e,t){const n=this._lastEventId=t&&t.event_id?t.event_id:pe(),r=new Error("Sentry syntheticException");return this._withClient(((i,o)=>{i.captureException(e,{originalException:e,syntheticException:r,...t,event_id:n},o)})),n}captureMessage(e,t,n){const r=this._lastEventId=n&&n.event_id?n.event_id:pe(),i=new Error(e);return this._withClient(((o,a)=>{o.captureMessage(e,t,{originalException:e,syntheticException:i,...n,event_id:r},a)})),r}captureEvent(e,t){const n=t&&t.event_id?t.event_id:pe();return e.type||(this._lastEventId=n),this._withClient(((r,i)=>{r.captureEvent(e,{...t,event_id:n},i)})),n}lastEventId(){return this._lastEventId}addBreadcrumb(e,t){const{scope:n,client:r}=this.getStackTop();if(!r)return;const{beforeBreadcrumb:i=null,maxBreadcrumbs:o=He}=r.getOptions&&r.getOptions()||{};if(o<=0)return;const a={timestamp:(0,Ve.yW)(),...e},s=i?R((()=>i(a,t))):a;null!==s&&(r.emit&&r.emit("beforeAddBreadcrumb",s,t),n.addBreadcrumb(s,o))}setUser(e){this.getScope().setUser(e)}setTags(e){this.getScope().setTags(e)}setExtras(e){this.getScope().setExtras(e)}setTag(e,t){this.getScope().setTag(e,t)}setExtra(e,t){this.getScope().setExtra(e,t)}setContext(e,t){this.getScope().setContext(e,t)}configureScope(e){const{scope:t,client:n}=this.getStackTop();n&&e(t)}run(e){const t=Xe(this);try{e(this)}finally{Xe(t)}}getIntegration(e){const t=this.getClient();if(!t)return null;try{return t.getIntegration(e)}catch(t){return("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.warn(`Cannot retrieve integration ${e.id} from the current Hub`),null}}startTransaction(e,t){const n=this._callExtensionMethod("startTransaction",e,t);return"undefined"!=typeof __SENTRY_DEBUG__&&!__SENTRY_DEBUG__||n||console.warn("Tracing extension 'startTransaction' has not been added. Call 'addTracingExtensions' before calling 'init':\nSentry.addTracingExtensions();\nSentry.init({...});\n"),n}traceHeaders(){return this._callExtensionMethod("traceHeaders")}captureSession(e=!1){if(e)return this.endSession();this._sendSessionUpdate()}endSession(){const e=this.getStackTop().scope,t=e.getSession();t&&function(e,t){let n={};"ok"===e.status&&(n={status:"exited"}),Ge(e,n)}(t),this._sendSessionUpdate(),e.setSession()}startSession(e){const{scope:t,client:n}=this.getStackTop(),{release:r,environment:i=Ye}=n&&n.getOptions()||{},{userAgent:o}=L.n2.navigator||{},a=function(e){const t=(0,Ve.ph)(),n={sid:pe(),init:!0,timestamp:t,started:t,duration:0,status:"ok",errors:0,ignoreDuration:!1,toJSON:()=>function(e){return fe({sid:`${e.sid}`,init:e.init,started:new Date(1e3*e.started).toISOString(),timestamp:new Date(1e3*e.timestamp).toISOString(),status:e.status,errors:e.errors,did:"number"==typeof e.did||"string"==typeof e.did?`${e.did}`:void 0,duration:e.duration,attrs:{release:e.release,environment:e.environment,ip_address:e.ipAddress,user_agent:e.userAgent}})}(n)};return e&&Ge(n,e),n}({release:r,environment:i,user:t.getUser(),...o&&{userAgent:o},...e}),s=t.getSession&&t.getSession();return s&&"ok"===s.status&&Ge(s,{status:"exited"}),this.endSession(),t.setSession(a),a}shouldSendDefaultPii(){const e=this.getClient(),t=e&&e.getOptions();return Boolean(t&&t.sendDefaultPii)}_sendSessionUpdate(){const{scope:e,client:t}=this.getStackTop(),n=e.getSession();n&&t&&t.captureSession&&t.captureSession(n)}_withClient(e){const{scope:t,client:n}=this.getStackTop();n&&e(n,t)}_callExtensionMethod(e,...t){const n=Qe().__SENTRY__;if(n&&n.extensions&&"function"==typeof n.extensions[e])return n.extensions[e].apply(this,t);("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.warn(`Extension method ${e} couldn't be found, doing nothing.`)}}function Qe(){return L.n2.__SENTRY__=L.n2.__SENTRY__||{extensions:{},hub:void 0},L.n2}function Xe(e){const t=Qe(),n=et(t);return tt(t,e),n}function Ze(){const e=Qe();if(e.__SENTRY__&&e.__SENTRY__.acs){const t=e.__SENTRY__.acs.getCurrentHub();if(t)return t}return function(e=Qe()){return t=e,!!(t&&t.__SENTRY__&&t.__SENTRY__.hub)&&!et(e).isOlderThan(ze)||tt(e,new Ke),et(e);var t}(e)}function et(e){return(0,L.YO)("hub",(()=>new Ke),e)}function tt(e,t){return!!e&&((e.__SENTRY__=e.__SENTRY__||{}).hub=t,!0)}const nt=[];function rt(e,t){t[e.name]=e,-1===nt.indexOf(e.name)&&(e.setupOnce(qe,Ze),nt.push(e.name),("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.log(`Integration installed: ${e.name}`))}const it=new WeakMap,ot="Not capturing exception because it's already been captured.";class at{__init(){this._integrations={}}__init2(){this._integrationsInitialized=!1}__init3(){this._numProcessing=0}__init4(){this._outcomes={}}__init5(){this._hooks={}}constructor(e){if(at.prototype.__init.call(this),at.prototype.__init2.call(this),at.prototype.__init3.call(this),at.prototype.__init4.call(this),at.prototype.__init5.call(this),this._options=e,e.dsn?this._dsn=function(e){const t="string"==typeof e?function(e){const t=F.exec(e);if(!t)return void console.error(`Invalid Sentry Dsn: ${e}`);const[n,r,i="",o,a="",s]=t.slice(1);let c="",u=s;const l=u.split("/");if(l.length>1&&(c=l.slice(0,-1).join("/"),u=l.pop()),u){const e=u.match(/^\d+/);e&&(u=e[0])}return U({host:o,pass:i,path:c,projectId:u,port:a,protocol:n,publicKey:r})}(e):U(e);if(t&&function(e){if("undefined"!=typeof __SENTRY_DEBUG__&&!__SENTRY_DEBUG__)return!0;const{port:t,projectId:n,protocol:r}=e;return!(["protocol","publicKey","host","projectId"].find((t=>!e[t]&&(j.error(`Invalid Sentry Dsn: ${t} missing`),!0)))||(n.match(/^\d+$/)?function(e){return"http"===e||"https"===e}(r)?t&&isNaN(parseInt(t,10))&&(j.error(`Invalid Sentry Dsn: Invalid port ${t}`),1):(j.error(`Invalid Sentry Dsn: Invalid protocol ${r}`),1):(j.error(`Invalid Sentry Dsn: Invalid projectId ${n}`),1)))}(t))return t}(e.dsn):("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.warn("No DSN provided, client will not do anything."),this._dsn){const t=Ue(this._dsn,e);this._transport=e.transport({recordDroppedEvent:this.recordDroppedEvent.bind(this),...e.transportOptions,url:t})}}captureException(e,t,n){if(ye(e))return void(("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.log(ot));let r=t&&t.event_id;return this._process(this.eventFromException(e,t).then((e=>this._captureEvent(e,t,n))).then((e=>{r=e}))),r}captureMessage(e,t,n,r){let i=n&&n.event_id;const o=W(e)?this.eventFromMessage(String(e),t,n):this.eventFromException(e,n);return this._process(o.then((e=>this._captureEvent(e,n,r))).then((e=>{i=e}))),i}captureEvent(e,t,n){if(t&&t.originalException&&ye(t.originalException))return void(("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.log(ot));let r=t&&t.event_id;return this._process(this._captureEvent(e,t,n).then((e=>{r=e}))),r}captureSession(e){this._isEnabled()?"string"!=typeof e.release?("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.warn("Discarded session because of missing or non-string release"):(this.sendSession(e),Ge(e,{init:!1})):("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.warn("SDK not enabled, will not capture session.")}getDsn(){return this._dsn}getOptions(){return this._options}getSdkMetadata(){return this._options._metadata}getTransport(){return this._transport}flush(e){const t=this._transport;return t?this._isClientDoneProcessing(e).then((n=>t.flush(e).then((e=>n&&e)))):Se(!0)}close(e){return this.flush(e).then((e=>(this.getOptions().enabled=!1,e)))}setupIntegrations(){this._isEnabled()&&!this._integrationsInitialized&&(this._integrations=function(e){const t={};return e.forEach((e=>{e&&rt(e,t)})),t}(this._options.integrations),this._integrationsInitialized=!0)}getIntegrationById(e){return this._integrations[e]}getIntegration(e){try{return this._integrations[e.id]||null}catch(t){return("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.warn(`Cannot retrieve integration ${e.id} from the current Client`),null}}addIntegration(e){rt(e,this._integrations)}sendEvent(e,t={}){if(this._dsn){let n=function(e,t,n,r){const i=je(n),o=e.type&&"replay_event"!==e.type?e.type:"event";!function(e,t){t&&(e.sdk=e.sdk||{},e.sdk.name=e.sdk.name||t.name,e.sdk.version=e.sdk.version||t.version,e.sdk.integrations=[...e.sdk.integrations||[],...t.integrations||[]],e.sdk.packages=[...e.sdk.packages||[],...t.packages||[]])}(e,n&&n.sdk);const a=function(e,t,n,r){const i=e.sdkProcessingMetadata&&e.sdkProcessingMetadata.dynamicSamplingContext;return{event_id:e.event_id,sent_at:(new Date).toISOString(),...t&&{sdk:t},...!!n&&{dsn:B(r)},...i&&{trace:fe({...i})}}}(e,i,r,t);return delete e.sdkProcessingMetadata,Oe(a,[[{type:o},e]])}(e,this._dsn,this._options._metadata,this._options.tunnel);for(const e of t.attachments||[])n=Pe(n,Ne(e,this._options.transportOptions&&this._options.transportOptions.textEncoder));const r=this._sendEnvelope(n);r&&r.then((t=>this.emit("afterSendEvent",e,t)),null)}}sendSession(e){if(this._dsn){const t=function(e,t,n,r){const i=je(n);return Oe({sent_at:(new Date).toISOString(),...i&&{sdk:i},...!!r&&{dsn:B(t)}},["aggregates"in e?[{type:"sessions"},e]:[{type:"session"},e.toJSON()]])}(e,this._dsn,this._options._metadata,this._options.tunnel);this._sendEnvelope(t)}}recordDroppedEvent(e,t,n){if(this._options.sendClientReports){const n=`${e}:${t}`;("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.log(`Adding outcome: "${n}"`),this._outcomes[n]=this._outcomes[n]+1||1}}on(e,t){this._hooks[e]||(this._hooks[e]=[]),this._hooks[e].push(t)}emit(e,...t){this._hooks[e]&&this._hooks[e].forEach((e=>e(...t)))}_updateSessionFromEvent(e,t){let n=!1,r=!1;const i=t.exception&&t.exception.values;if(i){r=!0;for(const e of i){const t=e.mechanism;if(t&&!1===t.handled){n=!0;break}}}const o="ok"===e.status;(o&&0===e.errors||o&&n)&&(Ge(e,{...n&&{status:"crashed"},errors:e.errors||Number(r||n)}),this.captureSession(e))}_isClientDoneProcessing(e){return new we((t=>{let n=0;const r=setInterval((()=>{0==this._numProcessing?(clearInterval(r),t(!0)):(n+=1,e&&n>=e&&(clearInterval(r),t(!1)))}),1)}))}_isEnabled(){return!1!==this.getOptions().enabled&&void 0!==this._dsn}_prepareEvent(e,t,n){const r=this.getOptions(),i=Object.keys(this._integrations);return!t.integrations&&i.length>0&&(t.integrations=i),function(e,t,n,r){const{normalizeDepth:i=3,normalizeMaxBreadth:o=1e3}=e,a={...t,event_id:t.event_id||n.event_id||pe(),timestamp:t.timestamp||(0,Ve.yW)()},s=n.integrations||e.integrations.map((e=>e.name));!function(e,t){const{environment:n,release:r,dist:i,maxValueLength:o=250}=t;"environment"in e||(e.environment="environment"in t?n:Ye),void 0===e.release&&void 0!==r&&(e.release=r),void 0===e.dist&&void 0!==i&&(e.dist=i),e.message&&(e.message=ne(e.message,o));const a=e.exception&&e.exception.values&&e.exception.values[0];a&&a.value&&(a.value=ne(a.value,o));const s=e.request;s&&s.url&&(s.url=ne(s.url,o))}(a,e),function(e,t){t.length>0&&(e.sdk=e.sdk||{},e.sdk.integrations=[...e.sdk.integrations||[],...t])}(a,s),void 0===t.type&&function(e,t){const n=L.n2._sentryDebugIds;if(!n)return;let r;const i=it.get(t);i?r=i:(r=new Map,it.set(t,r));const o=Object.keys(n).reduce(((e,i)=>{let o;const a=r.get(i);a?o=a:(o=t(i),r.set(i,o));for(let t=o.length-1;t>=0;t--){const r=o[t];if(r.filename){e[r.filename]=n[i];break}}return e}),{});try{e.exception.values.forEach((e=>{e.stacktrace.frames.forEach((e=>{e.filename&&(e.debug_id=o[e.filename])}))}))}catch(e){}}(a,e.stackParser);let c=r;n.captureContext&&(c=Je.clone(c).update(n.captureContext));let u=Se(a);if(c){if(c.getAttachments){const e=[...n.attachments||[],...c.getAttachments()];e.length&&(n.attachments=e)}u=c.applyToEvent(a,n)}return u.then((e=>(e&&function(e){const t={};try{e.exception.values.forEach((e=>{e.stacktrace.frames.forEach((e=>{e.debug_id&&(e.abs_path?t[e.abs_path]=e.debug_id:e.filename&&(t[e.filename]=e.debug_id),delete e.debug_id)}))}))}catch(e){}if(0===Object.keys(t).length)return;e.debug_meta=e.debug_meta||{},e.debug_meta.images=e.debug_meta.images||[];const n=e.debug_meta.images;Object.keys(t).forEach((e=>{n.push({type:"sourcemap",code_file:e,debug_id:t[e]})}))}(e),"number"==typeof i&&i>0?function(e,t,n){if(!e)return null;const r={...e,...e.breadcrumbs&&{breadcrumbs:e.breadcrumbs.map((e=>({...e,...e.data&&{data:Me(e.data,t,n)}})))},...e.user&&{user:Me(e.user,t,n)},...e.contexts&&{contexts:Me(e.contexts,t,n)},...e.extra&&{extra:Me(e.extra,t,n)}};return e.contexts&&e.contexts.trace&&r.contexts&&(r.contexts.trace=e.contexts.trace,e.contexts.trace.data&&(r.contexts.trace.data=Me(e.contexts.trace.data,t,n))),e.spans&&(r.spans=e.spans.map((e=>(e.data&&(e.data=Me(e.data,t,n)),e)))),r}(e,i,o):e)))}(r,e,t,n).then((e=>{if(null===e)return e;const{propagationContext:t}=e.sdkProcessingMetadata||{};if((!e.contexts||!e.contexts.trace)&&t){const{traceId:r,spanId:i,parentSpanId:o,dsc:a}=t;e.contexts={trace:{trace_id:r,span_id:i,parent_span_id:o},...e.contexts};const s=a||function(e,t,n){const r=t.getOptions(),{publicKey:i}=t.getDsn()||{},{segment:o}=n&&n.getUser()||{},a=fe({environment:r.environment||Ye,release:r.release,user_segment:o,public_key:i,trace_id:e});return t.emit&&t.emit("createDsc",a),a}(r,this,n);e.sdkProcessingMetadata={dynamicSamplingContext:s,...e.sdkProcessingMetadata}}return e}))}_captureEvent(e,t={},n){return this._processEvent(e,t,n).then((e=>e.event_id),(e=>{if("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__){const t=e;"log"===t.logLevel?j.log(t.message):j.warn(t)}}))}_processEvent(e,t,n){const r=this.getOptions(),{sampleRate:i}=r;if(!this._isEnabled())return Ee(new Fe("SDK not enabled, will not capture event.","log"));const o=ct(e),a=st(e),s=e.type||"error",c=`before send for type \`${s}\``;if(a&&"number"==typeof i&&Math.random()>i)return this.recordDroppedEvent("sample_rate","error",e),Ee(new Fe(`Discarding event because it's not included in the random sample (sampling rate = ${i})`,"log"));const u="replay_event"===s?"replay":s;return this._prepareEvent(e,t,n).then((n=>{if(null===n)throw this.recordDroppedEvent("event_processor",u,e),new Fe("An event processor returned `null`, will not send event.","log");if(t.data&&!0===t.data.__sentry__)return n;const i=function(e,t,n){const{beforeSend:r,beforeSendTransaction:i}=e;return st(t)&&r?r(t,n):ct(t)&&i?i(t,n):t}(r,n,t);return function(e,t){const n=`${t} must return \`null\` or a valid event.`;if(K(e))return e.then((e=>{if(!z(e)&&null!==e)throw new Fe(n);return e}),(e=>{throw new Fe(`${t} rejected with ${e}`)}));if(!z(e)&&null!==e)throw new Fe(n);return e}(i,c)})).then((r=>{if(null===r)throw this.recordDroppedEvent("before_send",u,e),new Fe(`${c} returned \`null\`, will not send event.`,"log");const i=n&&n.getSession();!o&&i&&this._updateSessionFromEvent(i,r);const a=r.transaction_info;if(o&&a&&r.transaction!==e.transaction){const e="custom";r.transaction_info={...a,source:e}}return this.sendEvent(r,t),r})).then(null,(e=>{if(e instanceof Fe)throw e;throw this.captureException(e,{data:{__sentry__:!0},originalException:e}),new Fe(`Event processing pipeline threw an error, original event will not be sent. Details have been sent as a new event.\nReason: ${e}`)}))}_process(e){this._numProcessing++,e.then((e=>(this._numProcessing--,e)),(e=>(this._numProcessing--,e)))}_sendEnvelope(e){if(this._transport&&this._dsn)return this.emit("beforeEnvelope",e),this._transport.send(e).then(null,(e=>{("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.error("Error while sending event:",e)}));("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.error("Transport disabled")}_clearOutcomes(){const e=this._outcomes;return this._outcomes={},Object.keys(e).map((t=>{const[n,r]=t.split(":");return{reason:n,category:r,quantity:e[t]}}))}}function st(e){return void 0===e.type}function ct(e){return"transaction"===e.type}const ut="7.60.1";var lt=n(518);function dt(e,t){const n=ht(e,t),r={type:t&&t.name,value:vt(t)};return n.length&&(r.stacktrace={frames:n}),void 0===r.type&&""===r.value&&(r.value="Unrecoverable error caught"),r}function ft(e,t){return{exception:{values:[dt(e,t)]}}}function ht(e,t){const n=t.stacktrace||t.stack||"",r=function(e){if(e){if("number"==typeof e.framesToPop)return e.framesToPop;if(pt.test(e.message))return 1}return 0}(t);try{return e(n,r)}catch(e){}return[]}const pt=/Minified React error #\d+;/i;function vt(e){const t=e&&e.message;return t?t.error&&"string"==typeof t.error.message?t.error.message:t:"No error message"}function _t(e,t,n,r,i){let o;if(J(t)&&t.error)return ft(e,t.error);if($(t)||G(t,"DOMException")){const i=t;if("stack"in t)o=ft(e,t);else{const t=i.name||($(i)?"DOMError":"DOMException"),a=i.message?`${t}: ${i.message}`:t;o=gt(e,a,n,r),ge(o,a)}return"code"in i&&(o.tags={...o.tags,"DOMException.code":`${i.code}`}),o}return Y(t)?ft(e,t):z(t)||H(t)?(o=function(e,t,n,r){const i=Ze().getClient(),o=i&&i.getOptions().normalizeDepth,a={exception:{values:[{type:H(t)?t.constructor.name:r?"UnhandledRejection":"Error",value:mt(t,{isUnhandledRejection:r})}]},extra:{__serialized__:Ce(t,o)}};if(n){const t=ht(e,n);t.length&&(a.exception.values[0].stacktrace={frames:t})}return a}(e,t,n,i),me(o,{synthetic:!0}),o):(o=gt(e,t,n,r),ge(o,`${t}`,void 0),me(o,{synthetic:!0}),o)}function gt(e,t,n,r){const i={message:t};if(r&&n){const r=ht(e,n);r.length&&(i.exception={values:[{value:t,stacktrace:{frames:r}}]})}return i}function mt(e,{isUnhandledRejection:t}){const n=function(e,t=40){const n=Object.keys(ue(e));if(n.sort(),!n.length)return"[object has no keys]";if(n[0].length>=t)return ne(n[0],t);for(let e=n.length;e>0;e--){const r=n.slice(0,e).join(", ");if(!(r.length>t))return e===n.length?r:ne(r,t)}return""}(e),r=t?"promise rejection":"exception";return J(e)?`Event \`ErrorEvent\` captured as ${r} with message \`${e.message}\``:H(e)?`Event \`${function(e){try{const t=Object.getPrototypeOf(e);return t?t.constructor.name:void 0}catch(e){}}(e)}\` (type=${e.type}) captured as ${r}`:`Object captured as ${r} with keys: ${n}`}const yt=L.n2;let bt=0;function St(){return bt>0}function Et(e,t={},n){if("function"!=typeof e)return e;try{const t=e.__sentry_wrapped__;if(t)return t;if(ce(e))return e}catch(t){return e}const r=function(){const r=Array.prototype.slice.call(arguments);try{n&&"function"==typeof n&&n.apply(this,arguments);const i=r.map((e=>Et(e,t)));return e.apply(this,i)}catch(e){throw bt++,setTimeout((()=>{bt--})),i=n=>{var i;n.addEventProcessor((e=>(t.mechanism&&(ge(e,void 0,void 0),me(e,t.mechanism)),e.extra={...e.extra,arguments:r},e))),i=e,Ze().captureException(i,{captureContext:undefined})},Ze().withScope(i),e}var i};try{for(const t in e)Object.prototype.hasOwnProperty.call(e,t)&&(r[t]=e[t])}catch(e){}se(r,e),ae(e,"__sentry_wrapped__",r);try{Object.getOwnPropertyDescriptor(r,"name").configurable&&Object.defineProperty(r,"name",{get(){return e.name}})}catch(e){}return r}const wt=(0,L.Rf)();function kt(e){return e&&/^function fetch\(\)\s+\{\s+\[native code\]\s+\}$/.test(e.toString())}const Tt=(0,L.Rf)(),Mt=(0,L.Rf)(),Ct="__sentry_xhr_v2__",At={},Ot={};function Pt(e){if(!Ot[e])switch(Ot[e]=!0,e){case"console":"console"in Mt&&N.forEach((function(e){e in Mt.console&&oe(Mt.console,e,(function(t){return function(...n){It("console",{args:n,level:e}),t&&t.apply(Mt.console,n)}}))}));break;case"dom":!function(){if(!("document"in Mt))return;const e=It.bind(null,"dom"),t=Bt(e,!0);Mt.document.addEventListener("click",t,!1),Mt.document.addEventListener("keypress",t,!1),["EventTarget","Node"].forEach((t=>{const n=Mt[t]&&Mt[t].prototype;n&&n.hasOwnProperty&&n.hasOwnProperty("addEventListener")&&(oe(n,"addEventListener",(function(t){return function(n,r,i){if("click"===n||"keypress"==n)try{const r=this,o=r.__sentry_instrumentation_handlers__=r.__sentry_instrumentation_handlers__||{},a=o[n]=o[n]||{refCount:0};if(!a.handler){const r=Bt(e);a.handler=r,t.call(this,n,r,i)}a.refCount++}catch(e){}return t.call(this,n,r,i)}})),oe(n,"removeEventListener",(function(e){return function(t,n,r){if("click"===t||"keypress"==t)try{const n=this,i=n.__sentry_instrumentation_handlers__||{},o=i[t];o&&(o.refCount--,o.refCount<=0&&(e.call(this,t,o.handler,r),o.handler=void 0,delete i[t]),0===Object.keys(i).length&&delete n.__sentry_instrumentation_handlers__)}catch(e){}return e.call(this,t,n,r)}})))}))}();break;case"xhr":!function(){if(!("XMLHttpRequest"in Mt))return;const e=XMLHttpRequest.prototype;oe(e,"open",(function(e){return function(...t){const n=t[1],r=this[Ct]={method:q(t[0])?t[0].toUpperCase():t[0],url:t[1],request_headers:{}};q(n)&&"POST"===r.method&&n.match(/sentry_key/)&&(this.__sentry_own_request__=!0);const i=()=>{const e=this[Ct];if(e&&4===this.readyState){try{e.status_code=this.status}catch(e){}It("xhr",{args:t,endTimestamp:Date.now(),startTimestamp:Date.now(),xhr:this})}};return"onreadystatechange"in this&&"function"==typeof this.onreadystatechange?oe(this,"onreadystatechange",(function(e){return function(...t){return i(),e.apply(this,t)}})):this.addEventListener("readystatechange",i),oe(this,"setRequestHeader",(function(e){return function(...t){const[n,r]=t,i=this[Ct];return i&&(i.request_headers[n.toLowerCase()]=r),e.apply(this,t)}})),e.apply(this,t)}})),oe(e,"send",(function(e){return function(...t){const n=this[Ct];return n&&void 0!==t[0]&&(n.body=t[0]),It("xhr",{args:t,startTimestamp:Date.now(),xhr:this}),e.apply(this,t)}}))}();break;case"fetch":(function(){if(!function(){if(!("fetch"in wt))return!1;try{return new Headers,new Request("http://www.example.com"),new Response,!0}catch(e){return!1}}())return!1;if(kt(wt.fetch))return!0;let e=!1;const t=wt.document;if(t&&"function"==typeof t.createElement)try{const n=t.createElement("iframe");n.hidden=!0,t.head.appendChild(n),n.contentWindow&&n.contentWindow.fetch&&(e=kt(n.contentWindow.fetch)),t.head.removeChild(n)}catch(e){("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.warn("Could not create sandbox iframe for pure fetch check, bailing to window.fetch: ",e)}return e})()&&oe(Mt,"fetch",(function(e){return function(...t){const{method:n,url:r}=function(e){if(0===e.length)return{method:"GET",url:""};if(2===e.length){const[t,n]=e;return{url:Nt(t),method:Lt(n,"method")?String(n.method).toUpperCase():"GET"}}const t=e[0];return{url:Nt(t),method:Lt(t,"method")?String(t.method).toUpperCase():"GET"}}(t),i={args:t,fetchData:{method:n,url:r},startTimestamp:Date.now()};return It("fetch",{...i}),e.apply(Mt,t).then((e=>(It("fetch",{...i,endTimestamp:Date.now(),response:e}),e)),(e=>{throw It("fetch",{...i,endTimestamp:Date.now(),error:e}),e}))}}));break;case"history":!function(){if(!function(){const e=Tt.chrome,t=e&&e.app&&e.app.runtime,n="history"in Tt&&!!Tt.history.pushState&&!!Tt.history.replaceState;return!t&&n}())return;const e=Mt.onpopstate;function t(e){return function(...t){const n=t.length>2?t[2]:void 0;if(n){const e=Rt,t=String(n);Rt=t,It("history",{from:e,to:t})}return e.apply(this,t)}}Mt.onpopstate=function(...t){const n=Mt.location.href,r=Rt;if(Rt=n,It("history",{from:r,to:n}),e)try{return e.apply(this,t)}catch(e){}},oe(Mt.history,"pushState",t),oe(Mt.history,"replaceState",t)}();break;case"error":Ut=Mt.onerror,Mt.onerror=function(e,t,n,r,i){return It("error",{column:r,error:i,line:n,msg:e,url:t}),!(!Ut||Ut.__SENTRY_LOADER__)&&Ut.apply(this,arguments)},Mt.onerror.__SENTRY_INSTRUMENTED__=!0;break;case"unhandledrejection":Vt=Mt.onunhandledrejection,Mt.onunhandledrejection=function(e){return It("unhandledrejection",e),!(Vt&&!Vt.__SENTRY_LOADER__)||Vt.apply(this,arguments)},Mt.onunhandledrejection.__SENTRY_INSTRUMENTED__=!0;break;default:return void(("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.warn("unknown instrumentation type:",e))}}function Dt(e,t){At[e]=At[e]||[],At[e].push(t),Pt(e)}function It(e,t){if(e&&At[e])for(const n of At[e]||[])try{n(t)}catch(t){("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.error(`Error while triggering instrumentation handler.\nType: ${e}\nName: ${Te(n)}\nError:`,t)}}function Lt(e,t){return!!e&&"object"==typeof e&&!!e[t]}function Nt(e){return"string"==typeof e?e:e?Lt(e,"url")?e.url:e.toString?e.toString():"":""}let Rt;const xt=1e3;let jt,Ft;function Bt(e,t=!1){return n=>{if(!n||Ft===n)return;if(function(e){if("keypress"!==e.type)return!1;try{const t=e.target;if(!t||!t.tagName)return!0;if("INPUT"===t.tagName||"TEXTAREA"===t.tagName||t.isContentEditable)return!1}catch(e){}return!0}(n))return;const r="keypress"===n.type?"input":n.type;(void 0===jt||function(e,t){if(!e)return!0;if(e.type!==t.type)return!0;try{if(e.target!==t.target)return!0}catch(e){}return!1}(Ft,n))&&(e({event:n,name:r,global:t}),Ft=n),clearTimeout(jt),jt=Mt.setTimeout((()=>{jt=void 0}),xt)}}let Ut=null,Vt=null;const Yt=["fatal","error","warning","log","info","debug"];function Gt(e){if(!e)return{};const t=e.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/);if(!t)return{};const n=t[6]||"",r=t[8]||"";return{host:t[4],path:t[5],protocol:t[2],search:n,hash:r,relative:t[5]+n+r}}const Jt="Breadcrumbs";class $t{static __initStatic(){this.id=Jt}__init(){this.name=$t.id}constructor(e){$t.prototype.__init.call(this),this.options={console:!0,dom:!0,fetch:!0,history:!0,sentry:!0,xhr:!0,...e}}setupOnce(){var e;this.options.console&&Dt("console",qt),this.options.dom&&Dt("dom",(e=this.options.dom,function(t){let n,r="object"==typeof e?e.serializeAttribute:void 0,i="object"==typeof e&&"number"==typeof e.maxStringLength?e.maxStringLength:void 0;i&&i>1024&&(("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.warn(`\`dom.maxStringLength\` cannot exceed 1024, but a value of ${i} was configured. Sentry will use 1024 instead.`),i=1024),"string"==typeof r&&(r=[r]);try{const e=t.event;n=function(e){return!!e&&!!e.target}(e)?ee(e.target,{keyAttrs:r,maxStringLength:i}):ee(e,{keyAttrs:r,maxStringLength:i})}catch(e){n="<unknown>"}0!==n.length&&Ze().addBreadcrumb({category:`ui.${t.name}`,message:n},{event:t.event,name:t.name,global:t.global})})),this.options.xhr&&Dt("xhr",Wt),this.options.fetch&&Dt("fetch",zt),this.options.history&&Dt("history",Ht)}addSentryBreadcrumb(e){this.options.sentry&&Ze().addBreadcrumb({category:"sentry."+("transaction"===e.type?"transaction":"event"),event_id:e.event_id,level:e.level,message:_e(e)},{event:e})}}function qt(e){for(let t=0;t<e.args.length;t++)if("ref=Ref<"===e.args[t]){e.args[t+1]="viewRef";break}const t={category:"console",data:{arguments:e.args,logger:"console"},level:(n=e.level,"warn"===n?"warning":Yt.includes(n)?n:"log"),message:re(e.args," ")};var n;if("assert"===e.level){if(!1!==e.args[0])return;t.message=`Assertion failed: ${re(e.args.slice(1)," ")||"console.assert"}`,t.data.arguments=e.args.slice(1)}Ze().addBreadcrumb(t,{input:e.args,level:e.level})}function Wt(e){const{startTimestamp:t,endTimestamp:n}=e,r=e.xhr[Ct];if(!t||!n||!r)return;const{method:i,url:o,status_code:a,body:s}=r,c={method:i,url:o,status_code:a},u={xhr:e.xhr,input:s,startTimestamp:t,endTimestamp:n};Ze().addBreadcrumb({category:"xhr",data:c,type:"http"},u)}function zt(e){const{startTimestamp:t,endTimestamp:n}=e;if(n&&(!e.fetchData.url.match(/sentry_key/)||"POST"!==e.fetchData.method))if(e.error){const r=e.fetchData,i={data:e.error,input:e.args,startTimestamp:t,endTimestamp:n};Ze().addBreadcrumb({category:"fetch",data:r,level:"error",type:"http"},i)}else{const r={...e.fetchData,status_code:e.response&&e.response.status},i={input:e.args,response:e.response,startTimestamp:t,endTimestamp:n};Ze().addBreadcrumb({category:"fetch",data:r,type:"http"},i)}}function Ht(e){let t=e.from,n=e.to;const r=Gt(yt.location.href);let i=Gt(t);const o=Gt(n);i.path||(i=r),r.protocol===o.protocol&&r.host===o.host&&(n=o.relative),r.protocol===i.protocol&&r.host===i.host&&(t=i.relative),Ze().addBreadcrumb({category:"navigation",data:{from:t,to:n}})}$t.__initStatic();class Kt extends at{constructor(e){const t=yt.SENTRY_SDK_SOURCE||(0,lt.S)();e._metadata=e._metadata||{},e._metadata.sdk=e._metadata.sdk||{name:"sentry.javascript.browser",packages:[{name:`${t}:@sentry/browser`,version:ut}],version:ut},super(e),e.sendClientReports&&yt.document&&yt.document.addEventListener("visibilitychange",(()=>{"hidden"===yt.document.visibilityState&&this._flushOutcomes()}))}eventFromException(e,t){return function(e,t,n,r){const i=_t(e,t,n&&n.syntheticException||void 0,r);return me(i),i.level="error",n&&n.event_id&&(i.event_id=n.event_id),Se(i)}(this._options.stackParser,e,t,this._options.attachStacktrace)}eventFromMessage(e,t="info",n){return function(e,t,n="info",r,i){const o=gt(e,t,r&&r.syntheticException||void 0,i);return o.level=n,r&&r.event_id&&(o.event_id=r.event_id),Se(o)}(this._options.stackParser,e,t,n,this._options.attachStacktrace)}sendEvent(e,t){const n=this.getIntegrationById(Jt);n&&n.addSentryBreadcrumb&&n.addSentryBreadcrumb(e),super.sendEvent(e,t)}captureUserFeedback(e){if(!this._isEnabled())return void(("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.warn("SDK not enabled, will not capture user feedback."));const t=function(e,{metadata:t,tunnel:n,dsn:r}){const i={event_id:e.event_id,sent_at:(new Date).toISOString(),...t&&t.sdk&&{sdk:{name:t.sdk.name,version:t.sdk.version}},...!!n&&!!r&&{dsn:B(r)}},o=function(e){return[{type:"user_report"},e]}(e);return Oe(i,[o])}(e,{metadata:this.getSdkMetadata(),dsn:this.getDsn(),tunnel:this.getOptions().tunnel});this._sendEnvelope(t)}_prepareEvent(e,t,n){return e.platform=e.platform||"javascript",super._prepareEvent(e,t,n)}_flushOutcomes(){const e=this._clearOutcomes();if(0===e.length)return void(("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.log("No outcomes to send"));if(!this._dsn)return void(("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.log("No dsn provided, will not send outcomes"));("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.log("Sending outcomes:",e);const t=(n=e,Oe((r=this._options.tunnel&&B(this._dsn))?{dsn:r}:{},[[{type:"client_report"},{timestamp:(0,Ve.yW)(),discarded_events:n}]]));var n,r;this._sendEnvelope(t)}}const Qt=6e4;const Xt=30;function Zt(e,t,n=function(e){const t=[];function n(e){return t.splice(t.indexOf(e),1)[0]}return{$:t,add:function(r){if(!(void 0===e||t.length<e))return Ee(new Fe("Not adding Promise because buffer limit was reached."));const i=r();return-1===t.indexOf(i)&&t.push(i),i.then((()=>n(i))).then(null,(()=>n(i).then(null,(()=>{})))),i},drain:function(e){return new we(((n,r)=>{let i=t.length;if(!i)return n(!0);const o=setTimeout((()=>{e&&e>0&&n(!1)}),e);t.forEach((e=>{Se(e).then((()=>{--i||(clearTimeout(o),n(!0))}),r)}))}))}}}(e.bufferSize||Xt)){let r={};function i(i){const o=[];if(De(i,((t,n)=>{const i=xe(n);if(function(e,t,n=Date.now()){return function(e,t){return e[t]||e.all||0}(e,t)>n}(r,i)){const r=en(t,n);e.recordDroppedEvent("ratelimit_backoff",i,r)}else o.push(t)})),0===o.length)return Se();const a=Oe(i[0],o),s=t=>{De(a,((n,r)=>{const i=en(n,r);e.recordDroppedEvent(t,xe(r),i)}))};return n.add((()=>t({body:Le(a,e.textEncoder)}).then((e=>(void 0!==e.statusCode&&(e.statusCode<200||e.statusCode>=300)&&("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.warn(`Sentry responded with status code ${e.statusCode} to sent event.`),r=function(e,{statusCode:t,headers:n},r=Date.now()){const i={...e},o=n&&n["x-sentry-rate-limits"],a=n&&n["retry-after"];if(o)for(const e of o.trim().split(",")){const[t,n]=e.split(":",2),o=parseInt(t,10),a=1e3*(isNaN(o)?60:o);if(n)for(const e of n.split(";"))i[e]=r+a;else i.all=r+a}else a?i.all=r+function(e,t=Date.now()){const n=parseInt(`${e}`,10);if(!isNaN(n))return 1e3*n;const r=Date.parse(`${e}`);return isNaN(r)?Qt:r-t}(a,r):429===t&&(i.all=r+6e4);return i}(r,e),e)),(e=>{throw s("network_error"),e})))).then((e=>e),(e=>{if(e instanceof Fe)return("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.error("Skipped sending event because buffer is full."),s("queue_overflow"),Se();throw e}))}return i.__sentry__baseTransport__=!0,{send:i,flush:e=>n.drain(e)}}function en(e,t){if("event"===t||"transaction"===t)return Array.isArray(e)?e[1]:void 0}let tn,nn;function rn(e,t=function(){if(tn)return tn;if(kt(yt.fetch))return tn=yt.fetch.bind(yt);const e=yt.document;let t=yt.fetch;if(e&&"function"==typeof e.createElement)try{const n=e.createElement("iframe");n.hidden=!0,e.head.appendChild(n);const r=n.contentWindow;r&&r.fetch&&(t=r.fetch),e.head.removeChild(n)}catch(e){("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.warn("Could not create sandbox iframe for pure fetch check, bailing to window.fetch: ",e)}return tn=t.bind(yt)}()){let n=0,r=0;return Zt(e,(function(i){const o=i.body.length;n+=o,r++;const a={body:i.body,method:"POST",referrerPolicy:"origin",headers:e.headers,keepalive:n<=6e4&&r<15,...e.fetchOptions};try{return t(e.url,a).then((e=>(n-=o,r--,{statusCode:e.status,headers:{"x-sentry-rate-limits":e.headers.get("X-Sentry-Rate-Limits"),"retry-after":e.headers.get("Retry-After")}})))}catch(e){return tn=void 0,n-=o,r--,Ee(e)}}))}class on{constructor(){on.prototype.__init.call(this)}static __initStatic(){this.id="FunctionToString"}__init(){this.name=on.id}setupOnce(){nn=Function.prototype.toString;try{Function.prototype.toString=function(...e){const t=ce(this)||this;return nn.apply(t,e)}}catch(e){}}}on.__initStatic();const an=[/^Script error\.?$/,/^Javascript error: Script error\.? on line 0$/],sn=[/^.*healthcheck.*$/,/^.*healthy.*$/,/^.*live.*$/,/^.*ready.*$/,/^.*heartbeat.*$/,/^.*\/health$/,/^.*\/healthz$/];class cn{static __initStatic(){this.id="InboundFilters"}__init(){this.name=cn.id}constructor(e={}){this._options=e,cn.prototype.__init.call(this)}setupOnce(e,t){const n=e=>{const n=t();if(n){const t=n.getIntegration(cn);if(t){const r=n.getClient(),i=r?r.getOptions():{},o=function(e={},t={}){return{allowUrls:[...e.allowUrls||[],...t.allowUrls||[]],denyUrls:[...e.denyUrls||[],...t.denyUrls||[]],ignoreErrors:[...e.ignoreErrors||[],...t.ignoreErrors||[],...e.disableErrorDefaults?[]:an],ignoreTransactions:[...e.ignoreTransactions||[],...t.ignoreTransactions||[],...e.disableTransactionDefaults?[]:sn],ignoreInternal:void 0===e.ignoreInternal||e.ignoreInternal}}(t._options,i);return function(e,t){return t.ignoreInternal&&function(e){try{return"SentryError"===e.exception.values[0].type}catch(e){}return!1}(e)?(("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.warn(`Event dropped due to being internal Sentry Error.\nEvent: ${_e(e)}`),!0):function(e,t){return!(e.type||!t||!t.length)&&function(e){if(e.message)return[e.message];if(e.exception){const{values:t}=e.exception;try{const{type:e="",value:n=""}=t&&t[t.length-1]||{};return[`${n}`,`${e}: ${n}`]}catch(t){return("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.error(`Cannot extract message for event ${_e(e)}`),[]}}return[]}(e).some((e=>ie(e,t)))}(e,t.ignoreErrors)?(("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.warn(`Event dropped due to being matched by \`ignoreErrors\` option.\nEvent: ${_e(e)}`),!0):function(e,t){if("transaction"!==e.type||!t||!t.length)return!1;const n=e.transaction;return!!n&&ie(n,t)}(e,t.ignoreTransactions)?(("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.warn(`Event dropped due to being matched by \`ignoreTransactions\` option.\nEvent: ${_e(e)}`),!0):function(e,t){if(!t||!t.length)return!1;const n=un(e);return!!n&&ie(n,t)}(e,t.denyUrls)?(("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.warn(`Event dropped due to being matched by \`denyUrls\` option.\nEvent: ${_e(e)}.\nUrl: ${un(e)}`),!0):!function(e,t){if(!t||!t.length)return!0;const n=un(e);return!n||ie(n,t)}(e,t.allowUrls)&&(("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.warn(`Event dropped due to not being matched by \`allowUrls\` option.\nEvent: ${_e(e)}.\nUrl: ${un(e)}`),!0)}(e,o)?null:e}}return e};n.id=this.name,e(n)}}function un(e){try{let t;try{t=e.exception.values[0].stacktrace.frames}catch(e){}return t?function(e=[]){for(let t=e.length-1;t>=0;t--){const n=e[t];if(n&&"<anonymous>"!==n.filename&&"[native code]"!==n.filename)return n.filename||null}return null}(t):null}catch(t){return("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.error(`Cannot extract url for event ${_e(e)}`),null}}cn.__initStatic();class ln{static __initStatic(){this.id="GlobalHandlers"}__init(){this.name=ln.id}__init2(){this._installFunc={onerror:dn,onunhandledrejection:fn}}constructor(e){ln.prototype.__init.call(this),ln.prototype.__init2.call(this),this._options={onerror:!0,onunhandledrejection:!0,...e}}setupOnce(){Error.stackTraceLimit=50;const e=this._options;for(const n in e){const r=this._installFunc[n];r&&e[n]&&(t=n,("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.log(`Global Handler attached: ${t}`),r(),this._installFunc[n]=void 0)}var t}}function dn(){Dt("error",(e=>{const[t,n,r]=vn();if(!t.getIntegration(ln))return;const{msg:i,url:o,line:a,column:s,error:c}=e;if(St()||c&&c.__sentry_own_request__)return;const u=void 0===c&&q(i)?function(e,t,n,r){let i=J(e)?e.message:e,o="Error";const a=i.match(/^(?:[Uu]ncaught (?:exception: )?)?(?:((?:Eval|Internal|Range|Reference|Syntax|Type|URI|)Error): )?(.*)$/i);a&&(o=a[1],i=a[2]);return hn({exception:{values:[{type:o,value:i}]}},t,n,r)}(i,o,a,s):hn(_t(n,c||i,void 0,r,!1),o,a,s);u.level="error",pn(t,c,u,"onerror")}))}function fn(){Dt("unhandledrejection",(e=>{const[t,n,r]=vn();if(!t.getIntegration(ln))return;let i=e;try{"reason"in e?i=e.reason:"detail"in e&&"reason"in e.detail&&(i=e.detail.reason)}catch(e){}if(St()||i&&i.__sentry_own_request__)return!0;const o=W(i)?{exception:{values:[{type:"UnhandledRejection",value:`Non-Error promise rejection captured with value: ${String(i)}`}]}}:_t(n,i,void 0,r,!0);o.level="error",pn(t,i,o,"onunhandledrejection")}))}function hn(e,t,n,r){const i=e.exception=e.exception||{},o=i.values=i.values||[],a=o[0]=o[0]||{},s=a.stacktrace=a.stacktrace||{},c=s.frames=s.frames||[],u=isNaN(parseInt(r,10))?void 0:r,l=isNaN(parseInt(n,10))?void 0:n,d=q(t)&&t.length>0?t:function(){try{return X.document.location.href}catch(e){return""}}();return 0===c.length&&c.push({colno:u,filename:d,function:"?",in_app:!0,lineno:l}),e}function pn(e,t,n,r){me(n,{handled:!1,type:r}),e.captureEvent(n,{originalException:t})}function vn(){const e=Ze(),t=e.getClient(),n=t&&t.getOptions()||{stackParser:()=>[],attachStacktrace:!1};return[e,n.stackParser,n.attachStacktrace]}ln.__initStatic();const _n=["EventTarget","Window","Node","ApplicationCache","AudioTrackList","ChannelMergerNode","CryptoOperation","EventSource","FileReader","HTMLUnknownElement","IDBDatabase","IDBRequest","IDBTransaction","KeyOperation","MediaController","MessagePort","ModalWindow","Notification","SVGElementInstance","Screen","TextTrack","TextTrackCue","TextTrackList","WebSocket","WebSocketWorker","Worker","XMLHttpRequest","XMLHttpRequestEventTarget","XMLHttpRequestUpload"];class gn{static __initStatic(){this.id="TryCatch"}__init(){this.name=gn.id}constructor(e){gn.prototype.__init.call(this),this._options={XMLHttpRequest:!0,eventTarget:!0,requestAnimationFrame:!0,setInterval:!0,setTimeout:!0,...e}}setupOnce(){this._options.setTimeout&&oe(yt,"setTimeout",mn),this._options.setInterval&&oe(yt,"setInterval",mn),this._options.requestAnimationFrame&&oe(yt,"requestAnimationFrame",yn),this._options.XMLHttpRequest&&"XMLHttpRequest"in yt&&oe(XMLHttpRequest.prototype,"send",bn);const e=this._options.eventTarget;e&&(Array.isArray(e)?e:_n).forEach(Sn)}}function mn(e){return function(...t){const n=t[0];return t[0]=Et(n,{mechanism:{data:{function:Te(e)},handled:!0,type:"instrument"}}),e.apply(this,t)}}function yn(e){return function(t){return e.apply(this,[Et(t,{mechanism:{data:{function:"requestAnimationFrame",handler:Te(e)},handled:!0,type:"instrument"}})])}}function bn(e){return function(...t){const n=this;return["onload","onerror","onprogress","onreadystatechange"].forEach((e=>{e in n&&"function"==typeof n[e]&&oe(n,e,(function(t){const n={mechanism:{data:{function:e,handler:Te(t)},handled:!0,type:"instrument"}},r=ce(t);return r&&(n.mechanism.data.handler=Te(r)),Et(t,n)}))})),e.apply(this,t)}}function Sn(e){const t=yt,n=t[e]&&t[e].prototype;n&&n.hasOwnProperty&&n.hasOwnProperty("addEventListener")&&(oe(n,"addEventListener",(function(t){return function(n,r,i){try{"function"==typeof r.handleEvent&&(r.handleEvent=Et(r.handleEvent,{mechanism:{data:{function:"handleEvent",handler:Te(r),target:e},handled:!0,type:"instrument"}}))}catch(e){}return t.apply(this,[n,Et(r,{mechanism:{data:{function:"addEventListener",handler:Te(r),target:e},handled:!0,type:"instrument"}}),i])}})),oe(n,"removeEventListener",(function(e){return function(t,n,r){const i=n;try{const n=i&&i.__sentry_wrapped__;n&&e.call(this,t,n,r)}catch(e){}return e.call(this,t,i,r)}})))}function En(e,t,n=250,r,i,o,a){if(!(o.exception&&o.exception.values&&a&&Q(a.originalException,Error)))return;const s=o.exception.values.length>0?o.exception.values[o.exception.values.length-1]:void 0;var c,u;s&&(o.exception.values=(c=wn(e,t,i,a.originalException,r,o.exception.values,s,0),u=n,c.map((e=>(e.value&&(e.value=ne(e.value,u)),e)))))}function wn(e,t,n,r,i,o,a,s){if(o.length>=n+1)return o;let c=[...o];if(Q(r[i],Error)){kn(a,s);const o=e(t,r[i]),u=c.length;Tn(o,i,u,s),c=wn(e,t,n,r[i],i,[o,...c],o,u)}return Array.isArray(r.errors)&&r.errors.forEach(((r,o)=>{if(Q(r,Error)){kn(a,s);const u=e(t,r),l=c.length;Tn(u,`errors[${o}]`,l,s),c=wn(e,t,n,r,i,[u,...c],u,l)}})),c}function kn(e,t){e.mechanism=e.mechanism||{type:"generic",handled:!0},e.mechanism={...e.mechanism,is_exception_group:!0,exception_id:t}}function Tn(e,t,n,r){e.mechanism=e.mechanism||{type:"generic",handled:!0},e.mechanism={...e.mechanism,type:"chained",source:t,exception_id:n,parent_id:r}}gn.__initStatic();class Mn{static __initStatic(){this.id="LinkedErrors"}__init(){this.name=Mn.id}constructor(e={}){Mn.prototype.__init.call(this),this._key=e.key||"cause",this._limit=e.limit||5}setupOnce(e,t){e(((e,n)=>{const r=t(),i=r.getClient(),o=r.getIntegration(Mn);if(!i||!o)return e;const a=i.getOptions();return En(dt,a.stackParser,a.maxValueLength,o._key,o._limit,e,n),e}))}}Mn.__initStatic();class Cn{constructor(){Cn.prototype.__init.call(this)}static __initStatic(){this.id="HttpContext"}__init(){this.name=Cn.id}setupOnce(){qe((e=>{if(Ze().getIntegration(Cn)){if(!yt.navigator&&!yt.location&&!yt.document)return e;const t=e.request&&e.request.url||yt.location&&yt.location.href,{referrer:n}=yt.document||{},{userAgent:r}=yt.navigator||{},i={...e.request&&e.request.headers,...n&&{Referer:n},...r&&{"User-Agent":r}},o={...e.request,...t&&{url:t},headers:i};return{...e,request:o}}return e}))}}Cn.__initStatic();class An{constructor(){An.prototype.__init.call(this)}static __initStatic(){this.id="Dedupe"}__init(){this.name=An.id}setupOnce(e,t){const n=e=>{if(e.type)return e;const n=t().getIntegration(An);if(n){try{if(function(e,t){return!!t&&(!!function(e,t){const n=e.message,r=t.message;return!(!n&&!r)&&(!(n&&!r||!n&&r)&&(n===r&&(!!Pn(e,t)&&!!On(e,t))))}(e,t)||!!function(e,t){const n=Dn(t),r=Dn(e);return!(!n||!r)&&(n.type===r.type&&n.value===r.value&&(!!Pn(e,t)&&!!On(e,t)))}(e,t))}(e,n._previousEvent))return("undefined"==typeof __SENTRY_DEBUG__||__SENTRY_DEBUG__)&&j.warn("Event dropped due to being a duplicate of previously captured event."),null}catch(t){return n._previousEvent=e}return n._previousEvent=e}return e};n.id=this.name,e(n)}}function On(e,t){let n=In(e),r=In(t);if(!n&&!r)return!0;if(n&&!r||!n&&r)return!1;if(r.length!==n.length)return!1;for(let e=0;e<r.length;e++){const t=r[e],i=n[e];if(t.filename!==i.filename||t.lineno!==i.lineno||t.colno!==i.colno||t.function!==i.function)return!1}return!0}function Pn(e,t){let n=e.fingerprint,r=t.fingerprint;if(!n&&!r)return!0;if(n&&!r||!n&&r)return!1;try{return!(n.join("")!==r.join(""))}catch(e){return!1}}function Dn(e){return e.exception&&e.exception.values&&e.exception.values[0]}function In(e){const t=e.exception;if(t)try{return t.values[0].stacktrace.frames}catch(e){return}}An.__initStatic();let Ln={};yt.Sentry&&yt.Sentry.Integrations&&(Ln=yt.Sentry.Integrations);const Nn={...Ln,...r,...i};var Rn="new",xn="loading",jn="loaded",Fn="joining-meeting",Bn="joined-meeting",Un="left-meeting",Vn="error",Yn="blocked",Gn="off",Jn="sendable",$n="loading",qn="interrupted",Wn="playable",zn="unknown",Hn="full",Kn="lobby",Qn="none",Xn="base",Zn="*",er="ejected",tr="nbf-room",nr="nbf-token",rr="exp-room",ir="exp-token",or="no-room",ar="meeting-full",sr="end-of-life",cr="not-allowed",ur="connection-error",lr="cam-in-use",dr="mic-in-use",fr="cam-mic-in-use",hr="permissions",pr="undefined-mediadevices",vr="not-found",_r="constraints",gr="unknown",mr="iframe-ready-for-launch-config",yr="iframe-launch-config",br="theme-updated",Sr="loading",Er="load-attempt-failed",wr="loaded",kr="started-camera",Tr="camera-error",Mr="joining-meeting",Cr="joined-meeting",Ar="left-meeting",Or="participant-joined",Pr="participant-updated",Dr="participant-left",Ir="participant-counts-updated",Lr="access-state-updated",Nr="meeting-session-summary-updated",Rr="meeting-session-state-updated",xr="meeting-session-data-error",jr="waiting-participant-added",Fr="waiting-participant-updated",Br="waiting-participant-removed",Ur="track-started",Vr="track-stopped",Yr="transcription-started",Gr="transcription-stopped",Jr="transcription-error",$r="recording-started",qr="recording-stopped",Wr="recording-stats",zr="recording-error",Hr="recording-upload-completed",Kr="recording-data",Qr="app-message",Xr="transcription-message",Zr="remote-media-player-started",ei="remote-media-player-updated",ti="remote-media-player-stopped",ni="local-screen-share-started",ri="local-screen-share-stopped",ii="local-screen-share-canceled",oi="active-speaker-change",ai="active-speaker-mode-change",si="network-quality-change",ci="network-connection",ui="cpu-load-change",li="face-counts-updated",di="fullscreen",fi="exited-fullscreen",hi="live-streaming-started",pi="live-streaming-updated",vi="live-streaming-stopped",_i="live-streaming-error",gi="lang-updated",mi="receive-settings-updated",yi="input-settings-updated",bi="nonfatal-error",Si="error",Ei=4096,wi=102400,ki="iframe-call-message",Ti="local-screen-start",Mi="daily-method-update-live-streaming-endpoints",Ci="transmit-log",Ai="daily-custom-track",Oi={NONE:"none",BGBLUR:"background-blur",BGIMAGE:"background-image",FACE_DETECTION:"face-detection"},Pi={NONE:"none",NOISE_CANCELLATION:"noise-cancellation"},Di={PLAY:"play",PAUSE:"pause"},Ii=["jpg","png","jpeg"],Li="sip-call-transfer";function Ni(){return!Ri()&&"undefined"!=typeof window&&window.navigator&&window.navigator.userAgent?window.navigator.userAgent:""}function Ri(){return"undefined"!=typeof navigator&&navigator.product&&"ReactNative"===navigator.product}function xi(){return navigator&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia}function ji(){if(Ri())return!1;if(!document)return!1;var e=document.createElement("iframe");return!!e.requestFullscreen||!!e.webkitRequestFullscreen}var Fi=function(){try{var e=document.createElement("canvas"),t=null!=e.getContext("webgl2");return e.remove(),t}catch(e){return!1}}();function Bi(){var e=arguments.length>0&&void 0!==arguments[0]&&arguments[0];return!Ri()&&!!Fi&&(e?!Gi()&&["Chrome","Firefox"].includes(Ji()):function(){if(Gi())return!1;var e=Ji();if("Safari"===e){var t=Hi();if(t.major<15||15===t.major&&t.minor<4)return!1}return"Chrome"===e?qi().major>=77:"Firefox"===e?Ki().major>=97:["Chrome","Firefox","Safari"].includes(e)}())}function Ui(){if(Ri())return!1;if(Yi())return!1;if("undefined"==typeof AudioWorkletNode)return!1;switch(Ji()){case"Chrome":case"Firefox":return!0;case"Safari":return $i().major>=17}return!1}function Vi(){return xi()&&!function(){var e,t=Ji();if(!Ni())return!0;switch(t){case"Chrome":return(e=qi()).major&&e.major>0&&e.major<75;case"Firefox":return(e=Ki()).major<91;case"Safari":return(e=Hi()).major<13||13===e.major&&e.minor<1;default:return!0}}()}function Yi(){return Ni().match(/Linux; Android/)}function Gi(){var e,t,n=Ni(),r=n.match(/Mac/)&&(!Ri()&&"undefined"!=typeof window&&null!==(e=window)&&void 0!==e&&null!==(t=e.navigator)&&void 0!==t&&t.maxTouchPoints?window.navigator.maxTouchPoints:0)>=5;return!!(n.match(/Mobi/)||n.match(/Android/)||r)||!!Ni().match(/DailyAnd\//)||void 0}function Ji(){if("undefined"!=typeof window){var e=Ni();return Wi()?"Safari":e.indexOf("Edge")>-1?"Edge":e.match(/Chrome\//)?"Chrome":e.indexOf("Safari")>-1||zi()?"Safari":e.indexOf("Firefox")>-1?"Firefox":e.indexOf("MSIE")>-1||e.indexOf(".NET")>-1?"IE":"Unknown Browser"}}function $i(){switch(Ji()){case"Chrome":return qi();case"Safari":return Hi();case"Firefox":return Ki();case"Edge":return function(){var e=0,t=0;if("undefined"!=typeof window){var n=Ni().match(/Edge\/(\d+).(\d+)/);if(n)try{e=parseInt(n[1]),t=parseInt(n[2])}catch(e){}}return{major:e,minor:t}}()}}function qi(){var e=0,t=0,n=0,r=0,i=!1;if("undefined"!=typeof window){var o=Ni(),a=o.match(/Chrome\/(\d+).(\d+).(\d+).(\d+)/);if(a)try{e=parseInt(a[1]),t=parseInt(a[2]),n=parseInt(a[3]),r=parseInt(a[4]),i=o.indexOf("OPR/")>-1}catch(e){}}return{major:e,minor:t,build:n,patch:r,opera:i}}function Wi(){return!!Ni().match(/iPad|iPhone|iPod/i)&&xi()}function zi(){return Ni().indexOf("AppleWebKit/605.1.15")>-1}function Hi(){var e=0,t=0,n=0;if("undefined"!=typeof window){var r=Ni().match(/Version\/(\d+).(\d+)(.(\d+))?/);if(r)try{e=parseInt(r[1]),t=parseInt(r[2]),n=parseInt(r[4])}catch(e){}else(Wi()||zi())&&(e=14,t=0,n=3)}return{major:e,minor:t,point:n}}function Ki(){var e=0,t=0;if("undefined"!=typeof window){var n=Ni().match(/Firefox\/(\d+).(\d+)/);if(n)try{e=parseInt(n[1]),t=parseInt(n[2])}catch(e){}}return{major:e,minor:t}}var Qi=function(){function e(){a(this,e)}return l(e,[{key:"addListenerForMessagesFromCallMachine",value:function(e,t,n){O()}},{key:"addListenerForMessagesFromDailyJs",value:function(e,t,n){O()}},{key:"sendMessageToCallMachine",value:function(e,t,n,r){O()}},{key:"sendMessageToDailyJs",value:function(e,t){O()}},{key:"removeListener",value:function(e){O()}}]),e}();function Xi(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function Zi(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?Xi(Object(n),!0).forEach((function(t){_(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):Xi(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}var eo=function(e){h(i,e);var t,n,r=(t=i,n=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(e){return!1}}(),function(){var e,r=v(t);if(n){var i=v(this).constructor;e=Reflect.construct(r,arguments,i)}else e=r.apply(this,arguments);return p(this,e)});function i(){var e;return a(this,i),(e=r.call(this))._wrappedListeners={},e._messageCallbacks={},e}return l(i,[{key:"addListenerForMessagesFromCallMachine",value:function(e,t,n){var r=this,i=function(i){if(i.data&&"iframe-call-message"===i.data.what&&(!i.data.callClientId||i.data.callClientId===t)&&(!i.data.from||"module"!==i.data.from)){var o=Zi({},i.data);if(delete o.from,o.callbackStamp&&r._messageCallbacks[o.callbackStamp]){var a=o.callbackStamp;r._messageCallbacks[a].call(n,o),delete r._messageCallbacks[a]}delete o.what,delete o.callbackStamp,e.call(n,o)}};this._wrappedListeners[e]=i,window.addEventListener("message",i)}},{key:"addListenerForMessagesFromDailyJs",value:function(e,t,n){var r=function(r){var i;if(!(!r.data||r.data.what!==ki||!r.data.action||r.data.from&&"module"!==r.data.from||r.data.callClientId&&t&&r.data.callClientId!==t||null!=r&&null!==(i=r.data)&&void 0!==i&&i.callFrameId)){var o=r.data;e.call(n,o)}};this._wrappedListeners[e]=r,window.addEventListener("message",r)}},{key:"sendMessageToCallMachine",value:function(e,t,n,r){if(!n)throw new Error("undefined callClientId. Are you trying to use a DailyCall instance previously destroyed?");var i=Zi({},e);if(i.what=ki,i.from="module",i.callClientId=n,t){var o=A();this._messageCallbacks[o]=t,i.callbackStamp=o}var a=r?r.contentWindow:window,s=this._callMachineTargetOrigin(r);s&&a.postMessage(i,s)}},{key:"sendMessageToDailyJs",value:function(e,t){e.what=ki,e.callClientId=t,e.from="embedded",window.postMessage(e,this._targetOriginFromWindowLocation())}},{key:"removeListener",value:function(e){var t=this._wrappedListeners[e];t&&(window.removeEventListener("message",t),delete this._wrappedListeners[e])}},{key:"forwardPackagedMessageToCallMachine",value:function(e,t,n){var r=Zi({},e);r.callClientId=n;var i=t?t.contentWindow:window,o=this._callMachineTargetOrigin(t);o&&i.postMessage(r,o)}},{key:"addListenerForPackagedMessagesFromCallMachine",value:function(e,t){var n=function(n){if(n.data&&"iframe-call-message"===n.data.what&&(!n.data.callClientId||n.data.callClientId===t)&&(!n.data.from||"module"!==n.data.from)){var r=n.data;e(r)}};return this._wrappedListeners[e]=n,window.addEventListener("message",n),e}},{key:"removeListenerForPackagedMessagesFromCallMachine",value:function(e){var t=this._wrappedListeners[e];t&&(window.removeEventListener("message",t),delete this._wrappedListeners[e])}},{key:"_callMachineTargetOrigin",value:function(e){return e?e.src?new URL(e.src).origin:void 0:this._targetOriginFromWindowLocation()}},{key:"_targetOriginFromWindowLocation",value:function(){return"file:"===window.location.protocol?"*":window.location.origin}}]),i}(Qi);function to(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}var no=function(e){h(i,e);var t,n,r=(t=i,n=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(e){return!1}}(),function(){var e,r=v(t);if(n){var i=v(this).constructor;e=Reflect.construct(r,arguments,i)}else e=r.apply(this,arguments);return p(this,e)});function i(){var e;return a(this,i),e=r.call(this),window.callMachineToDailyJsEmitter=window.callMachineToDailyJsEmitter||new S.EventEmitter,window.dailyJsToCallMachineEmitter=window.dailyJsToCallMachineEmitter||new S.EventEmitter,e._wrappedListeners={},e._messageCallbacks={},e}return l(i,[{key:"addListenerForMessagesFromCallMachine",value:function(e,t,n){this._addListener(e,window.callMachineToDailyJsEmitter,t,n,"received call machine message")}},{key:"addListenerForMessagesFromDailyJs",value:function(e,t,n){this._addListener(e,window.dailyJsToCallMachineEmitter,t,n,"received daily-js message")}},{key:"sendMessageToCallMachine",value:function(e,t,n){this._sendMessage(e,window.dailyJsToCallMachineEmitter,n,t,"sending message to call machine")}},{key:"sendMessageToDailyJs",value:function(e,t){this._sendMessage(e,window.callMachineToDailyJsEmitter,t,null,"sending message to daily-js")}},{key:"removeListener",value:function(e){var t=this._wrappedListeners[e];t&&(window.callMachineToDailyJsEmitter.removeListener("message",t),window.dailyJsToCallMachineEmitter.removeListener("message",t),delete this._wrappedListeners[e])}},{key:"_addListener",value:function(e,t,n,r,i){var o=this,a=function(t){if(t.callClientId===n){if(t.callbackStamp&&o._messageCallbacks[t.callbackStamp]){var i=t.callbackStamp;o._messageCallbacks[i].call(r,t),delete o._messageCallbacks[i]}e.call(r,t)}};this._wrappedListeners[e]=a,t.addListener("message",a)}},{key:"_sendMessage",value:function(e,t,n,r,i){var o=function(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?to(Object(n),!0).forEach((function(t){_(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):to(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}({},e);if(o.callClientId=n,r){var a=A();this._messageCallbacks[a]=r,o.callbackStamp=a}t.emit("message",o)}}]),i}(Qi),ro="replace",io="shallow-merge",oo=[ro,io];var ao=function(){function e(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},n=t.data,r=t.mergeStrategy,i=void 0===r?ro:r;a(this,e),e._validateMergeStrategy(i),e._validateData(n,i),this.mergeStrategy=i,this.data=n}return l(e,[{key:"isNoOp",value:function(){return e.isNoOpUpdate(this.data,this.mergeStrategy)}}],[{key:"isNoOpUpdate",value:function(e,t){return 0===Object.keys(e).length&&t===io}},{key:"_validateMergeStrategy",value:function(e){if(!oo.includes(e))throw Error("Unrecognized mergeStrategy provided. Options are: [".concat(oo,"]"))}},{key:"_validateData",value:function(e,t){if(!function(e){if(null==e||"object"!==s(e))return!1;var t=Object.getPrototypeOf(e);return null==t||t===Object.prototype}(e))throw Error("Meeting session data must be a plain (map-like) object");var n;try{if(n=JSON.stringify(e),t===ro){var r=JSON.parse(n);T(r,e)||console.warn("The meeting session data provided will be modified when serialized.",r,e)}else if(t===io)for(var i in e)if(Object.hasOwnProperty.call(e,i)&&void 0!==e[i]){var o=JSON.parse(JSON.stringify(e[i]));T(e[i],o)||console.warn("At least one key in the meeting session data provided will be modified when serialized.",o,e[i])}}catch(e){throw Error("Meeting session data must be serializable to JSON: ".concat(e))}if(n.length>wi)throw Error("Meeting session data is too large (".concat(n.length," characters). Maximum size suppported is ").concat(wi,"."))}}]),e}();function so(e,t,n){return so=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(e){return!1}}()?Reflect.construct.bind():function(e,t,n){var r=[null];r.push.apply(r,t);var i=new(Function.bind.apply(e,r));return n&&f(i,n.prototype),i},so.apply(null,arguments)}function co(e){var t="function"==typeof Map?new Map:void 0;return co=function(e){if(null===e||(n=e,-1===Function.toString.call(n).indexOf("[native code]")))return e;var n;if("function"!=typeof e)throw new TypeError("Super expression must either be null or a function");if(void 0!==t){if(t.has(e))return t.get(e);t.set(e,r)}function r(){return so(e,arguments,v(this).constructor)}return r.prototype=Object.create(e.prototype,{constructor:{value:r,enumerable:!1,writable:!0,configurable:!0}}),f(r,e)},co(e)}function uo(e){var t,n=null===(t=window._daily)||void 0===t?void 0:t.pendings;if(n){var r=n.indexOf(e);-1!==r&&n.splice(r,1)}}var lo=function(){function e(t){a(this,e),this._currentLoad=null,this._callClientId=t}return l(e,[{key:"load",value:function(){var e,t=this,n=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},r=arguments.length>1?arguments[1]:void 0,i=arguments.length>2?arguments[2]:void 0;if(this.loaded)return window._daily.instances[this._callClientId].callMachine.reset(),void r(!0);e=this._callClientId,window._daily.pendings.push(e),this._currentLoad&&this._currentLoad.cancel(),this._currentLoad=new fo(n,(function(){r(!1)}),(function(e,n){n||uo(t._callClientId),i(e,n)})),this._currentLoad.start()}},{key:"cancel",value:function(){this._currentLoad&&this._currentLoad.cancel(),uo(this._callClientId)}},{key:"loaded",get:function(){return this._currentLoad&&this._currentLoad.succeeded}}]),e}(),fo=function(){function e(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},n=arguments.length>1?arguments[1]:void 0,r=arguments.length>2?arguments[2]:void 0;a(this,e),this._attemptsRemaining=3,this._currentAttempt=null,this._dailyConfig=t,this._successCallback=n,this._failureCallback=r}return l(e,[{key:"start",value:function(){var e=this;this._currentAttempt||(this._currentAttempt=new vo(this._dailyConfig,this._successCallback,(function t(n){e._currentAttempt.cancelled||(e._attemptsRemaining--,e._failureCallback(n,e._attemptsRemaining>0),e._attemptsRemaining<=0||setTimeout((function(){e._currentAttempt.cancelled||(e._currentAttempt=new vo(e._dailyConfig,e._successCallback,t),e._currentAttempt.start())}),3e3))})),this._currentAttempt.start())}},{key:"cancel",value:function(){this._currentAttempt&&this._currentAttempt.cancel()}},{key:"cancelled",get:function(){return this._currentAttempt&&this._currentAttempt.cancelled}},{key:"succeeded",get:function(){return this._currentAttempt&&this._currentAttempt.succeeded}}]),e}(),ho=function(e){h(i,e);var t,n,r=(t=i,n=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(e){return!1}}(),function(){var e,r=v(t);if(n){var i=v(this).constructor;e=Reflect.construct(r,arguments,i)}else e=r.apply(this,arguments);return p(this,e)});function i(){return a(this,i),r.apply(this,arguments)}return l(i)}(co(Error)),po=2e4,vo=function(){function e(t,n,r){a(this,e),this._loadAttemptImpl=Ri()||!t.avoidEval?new _o(t,n,r):new go(t,n,r)}var t;return l(e,[{key:"start",value:(t=m((function*(){return this._loadAttemptImpl.start()})),function(){return t.apply(this,arguments)})},{key:"cancel",value:function(){this._loadAttemptImpl.cancel()}},{key:"cancelled",get:function(){return this._loadAttemptImpl.cancelled}},{key:"succeeded",get:function(){return this._loadAttemptImpl.succeeded}}]),e}(),_o=function(){function e(t,n,r){a(this,e),this.cancelled=!1,this.succeeded=!1,this._networkTimedOut=!1,this._networkTimeout=null,this._iosCache="undefined"!=typeof iOSCallObjectBundleCache&&iOSCallObjectBundleCache,this._refetchHeaders=null,this._dailyConfig=t,this._successCallback=n,this._failureCallback=r}var t,n,r,i;return l(e,[{key:"start",value:(i=m((function*(){var e=D(this._dailyConfig);!(yield this._tryLoadFromIOSCache(e))&&this._loadFromNetwork(e)})),function(){return i.apply(this,arguments)})},{key:"cancel",value:function(){clearTimeout(this._networkTimeout),this.cancelled=!0}},{key:"_tryLoadFromIOSCache",value:(r=m((function*(e){if(!this._iosCache)return!1;try{var t=yield this._iosCache.get(e);return!!this.cancelled||!!t&&(t.code?(Function('"use strict";'+t.code)(),this.succeeded=!0,this._successCallback(),!0):(this._refetchHeaders=t.refetchHeaders,!1))}catch(e){return!1}})),function(e){return r.apply(this,arguments)})},{key:"_loadFromNetwork",value:(n=m((function*(e){var t=this;this._networkTimeout=setTimeout((function(){t._networkTimedOut=!0,t._failureCallback({msg:"Timed out (>".concat(po," ms) when loading call object bundle ").concat(e),type:"timeout"})}),po);try{var n=this._refetchHeaders?{headers:this._refetchHeaders}:{},r=yield fetch(e,n);if(clearTimeout(this._networkTimeout),this.cancelled||this._networkTimedOut)throw new ho;var i=yield this._getBundleCodeFromResponse(e,r);if(this.cancelled)throw new ho;Function('"use strict";'+i)(),this._iosCache&&this._iosCache.set(e,i,r.headers),this.succeeded=!0,this._successCallback()}catch(t){if(clearTimeout(this._networkTimeout),t instanceof ho||this.cancelled||this._networkTimedOut)return;this._failureCallback({msg:"Failed to load call object bundle ".concat(e,": ").concat(t),type:t.message})}})),function(e){return n.apply(this,arguments)})},{key:"_getBundleCodeFromResponse",value:(t=m((function*(e,t){if(t.ok)return yield t.text();if(this._iosCache&&304===t.status)return(yield this._iosCache.renew(e,t.headers)).code;throw new Error("Received ".concat(t.status," response"))})),function(e,n){return t.apply(this,arguments)})}]),e}(),go=function(){function e(t,n,r){a(this,e),this.cancelled=!1,this.succeeded=!1,this._dailyConfig=t,this._successCallback=n,this._failureCallback=r,this._attemptId=A(),this._networkTimeout=null,this._scriptElement=null}return l(e,[{key:"start",value:function(){window._dailyCallMachineLoadWaitlist||(window._dailyCallMachineLoadWaitlist=new Set);var e=D(this._dailyConfig);"object"===("undefined"==typeof document?"undefined":s(document))?this._startLoading(e):this._failureCallback({msg:"Call object bundle must be loaded in a DOM/web context",type:"missing context"})}},{key:"cancel",value:function(){this._stopLoading(),this.cancelled=!0}},{key:"_startLoading",value:function(e){var t=this;this._signUpForCallMachineLoadWaitlist(),this._networkTimeout=setTimeout((function(){t._stopLoading(),t._failureCallback({msg:"Timed out (>".concat(po," ms) when loading call object bundle ").concat(e),type:"timeout"})}),po);var n=document.getElementsByTagName("head")[0],r=document.createElement("script");this._scriptElement=r,r.onload=function(){t._stopLoading(),t.succeeded=!0,t._successCallback()},r.onerror=function(e){t._stopLoading(),t._failureCallback({msg:"Failed to load call object bundle ".concat(e.target.src),type:e.message})},r.src=e,n.appendChild(r)}},{key:"_stopLoading",value:function(){this._withdrawFromCallMachineLoadWaitlist(),clearTimeout(this._networkTimeout),this._scriptElement&&(this._scriptElement.onload=null,this._scriptElement.onerror=null)}},{key:"_signUpForCallMachineLoadWaitlist",value:function(){window._dailyCallMachineLoadWaitlist.add(this._attemptId)}},{key:"_withdrawFromCallMachineLoadWaitlist",value:function(){window._dailyCallMachineLoadWaitlist.delete(this._attemptId)}}]),e}(),mo=function(e,t,n){return!0===So(e.local,t,n)},yo=function(e,t,n){return e.local.streams&&e.local.streams[t]&&e.local.streams[t].stream&&e.local.streams[t].stream["get".concat("video"===n?"Video":"Audio","Tracks")]()[0]},bo=function(e,t,n,r){var i=Eo(e,t,n,r);return i&&i.pendingTrack},So=function(e,t,n){if(!e)return!1;var r=function(e){switch(e){case"avatar":return!0;case"staged":return e;default:return!!e}},i=e.public.subscribedTracks;return i&&i[t]?-1===["cam-audio","cam-video","screen-video","screen-audio","rmpAudio","rmpVideo"].indexOf(n)&&i[t].custom?[!0,"staged"].includes(i[t].custom)?r(i[t].custom):r(i[t].custom[n]):r(i[t][n]):!i||r(i.ALL)},Eo=function(e,t,n,r){var i=Object.values(e.streams||{}).filter((function(e){return e.participantId===t&&e.type===n&&e.pendingTrack&&e.pendingTrack.kind===r})).sort((function(e,t){return new Date(t.starttime)-new Date(e.starttime)}));return i&&i[0]},wo=function(e,t){var n=e.local.public.customTracks;if(n&&n[t])return n[t].track};function ko(e,t){for(var n=t.getState(),r=0,i=["cam","screen"];r<i.length;r++)for(var o=i[r],a=0,s=["video","audio"];a<s.length;a++){var c=s[a],u="cam"===o?c:"screen".concat(c.charAt(0).toUpperCase()+c.slice(1)),l=e.tracks[u];if(l){var d=e.local?yo(n,o,c):bo(n,e.session_id,o,c);"playable"===l.state&&(l.track=d),l.persistentTrack=d}}}function To(e,t){try{var n=t.getState();for(var r in e.tracks)if(!Mo(r)){var i=e.tracks[r].kind;if(i){var o=e.tracks[r];if(o){var a=e.local?wo(n,r):bo(n,e.session_id,r,i);"playable"===o.state&&(e.tracks[r].track=a),o.persistentTrack=a}}else console.error("unknown type for custom track")}}catch(e){console.error(e)}}function Mo(e){return["video","audio","screenVideo","screenAudio"].includes(e)}function Co(e,t,n){var r=n.getState();if(e.local){if(e.audio)try{e.audioTrack=r.local.streams.cam.stream.getAudioTracks()[0],e.audioTrack||(e.audio=!1)}catch(e){}if(e.video)try{e.videoTrack=r.local.streams.cam.stream.getVideoTracks()[0],e.videoTrack||(e.video=!1)}catch(e){}if(e.screen)try{e.screenVideoTrack=r.local.streams.screen.stream.getVideoTracks()[0],e.screenAudioTrack=r.local.streams.screen.stream.getAudioTracks()[0],e.screenVideoTrack||e.screenAudioTrack||(e.screen=!1)}catch(e){}}else{var i=!0;try{var o=r.participants[e.session_id];o&&o.public&&o.public.rtcType&&"peer-to-peer"===o.public.rtcType.impl&&o.private&&!["connected","completed"].includes(o.private.peeringState)&&(i=!1)}catch(e){console.error(e)}if(!i)return e.audio=!1,e.audioTrack=!1,e.video=!1,e.videoTrack=!1,e.screen=!1,void(e.screenTrack=!1);try{if(r.streams,e.audio&&mo(r,e.session_id,"cam-audio")){var a=bo(r,e.session_id,"cam","audio");a&&(t&&t.audioTrack&&t.audioTrack.id===a.id?e.audioTrack=a:a.muted||(e.audioTrack=a)),e.audioTrack||(e.audio=!1)}if(e.video&&mo(r,e.session_id,"cam-video")){var s=bo(r,e.session_id,"cam","video");s&&(t&&t.videoTrack&&t.videoTrack.id===s.id?e.videoTrack=s:s.muted||(e.videoTrack=s)),e.videoTrack||(e.video=!1)}if(e.screen&&mo(r,e.session_id,"screen-audio")){var c=bo(r,e.session_id,"screen","audio");c&&(t&&t.screenAudioTrack&&t.screenAudioTrack.id===c.id?e.screenAudioTrack=c:c.muted||(e.screenAudioTrack=c))}if(e.screen&&mo(r,e.session_id,"screen-video")){var u=bo(r,e.session_id,"screen","video");u&&(t&&t.screenVideoTrack&&t.screenVideoTrack.id===u.id?e.screenVideoTrack=u:u.muted||(e.screenVideoTrack=u))}e.screenVideoTrack||e.screenAudioTrack||(e.screen=!1)}catch(e){console.error("unexpected error matching up tracks",e)}}}function Ao(e,t){(null==t||t>e.length)&&(t=e.length);for(var n=0,r=new Array(t);n<t;n++)r[n]=e[n];return r}var Oo=new Map,Po=null;function Do(e,t){(null==t||t>e.length)&&(t=e.length);for(var n=0,r=new Array(t);n<t;n++)r[n]=e[n];return r}var Io=new Map,Lo=null;function No(e){Ro()?function(e){Oo.has(e)||(Oo.set(e,{}),navigator.mediaDevices.enumerateDevices().then((function(t){Oo.has(e)&&(Oo.get(e).lastDevicesString=JSON.stringify(t),Po||(Po=function(){var e=m((function*(){var e,t=yield navigator.mediaDevices.enumerateDevices(),n=function(e,t){var n="undefined"!=typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(!n){if(Array.isArray(e)||(n=function(e,t){if(e){if("string"==typeof e)return Ao(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);return"Object"===n&&e.constructor&&(n=e.constructor.name),"Map"===n||"Set"===n?Array.from(e):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?Ao(e,t):void 0}}(e))||t&&e&&"number"==typeof e.length){n&&(e=n);var r=0,i=function(){};return{s:i,n:function(){return r>=e.length?{done:!0}:{done:!1,value:e[r++]}},e:function(e){throw e},f:i}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var o,a=!0,s=!1;return{s:function(){n=n.call(e)},n:function(){var e=n.next();return a=e.done,e},e:function(e){s=!0,o=e},f:function(){try{a||null==n.return||n.return()}finally{if(s)throw o}}}}(Oo.keys());try{for(n.s();!(e=n.n()).done;){var r=e.value,i=JSON.stringify(t);i!==Oo.get(r).lastDevicesString&&(Oo.get(r).lastDevicesString=i,r(t))}}catch(e){n.e(e)}finally{n.f()}}));return function(){return e.apply(this,arguments)}}(),navigator.mediaDevices.addEventListener("devicechange",Po)))})).catch((function(){})))}(e):function(e){Io.has(e)||(Io.set(e,{}),navigator.mediaDevices.enumerateDevices().then((function(t){Io.has(e)&&(Io.get(e).lastDevicesString=JSON.stringify(t),Lo||(Lo=setInterval(m((function*(){var e,t=yield navigator.mediaDevices.enumerateDevices(),n=function(e,t){var n="undefined"!=typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(!n){if(Array.isArray(e)||(n=function(e,t){if(e){if("string"==typeof e)return Do(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);return"Object"===n&&e.constructor&&(n=e.constructor.name),"Map"===n||"Set"===n?Array.from(e):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?Do(e,t):void 0}}(e))||t&&e&&"number"==typeof e.length){n&&(e=n);var r=0,i=function(){};return{s:i,n:function(){return r>=e.length?{done:!0}:{done:!1,value:e[r++]}},e:function(e){throw e},f:i}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var o,a=!0,s=!1;return{s:function(){n=n.call(e)},n:function(){var e=n.next();return a=e.done,e},e:function(e){s=!0,o=e},f:function(){try{a||null==n.return||n.return()}finally{if(s)throw o}}}}(Io.keys());try{for(n.s();!(e=n.n()).done;){var r=e.value,i=JSON.stringify(t);i!==Io.get(r).lastDevicesString&&(Io.get(r).lastDevicesString=i,r(t))}}catch(e){n.e(e)}finally{n.f()}})),3e3)))})))}(e)}function Ro(){return Ri()||void 0!==navigator.mediaDevices.ondevicechange}var xo=new Set;var jo=["result"],Fo=["preserveIframe"];function Bo(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function Uo(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?Bo(Object(n),!0).forEach((function(t){_(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):Bo(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function Vo(e,t){var n="undefined"!=typeof Symbol&&e[Symbol.iterator]||e["@@iterator"];if(!n){if(Array.isArray(e)||(n=function(e,t){if(e){if("string"==typeof e)return Yo(e,t);var n=Object.prototype.toString.call(e).slice(8,-1);return"Object"===n&&e.constructor&&(n=e.constructor.name),"Map"===n||"Set"===n?Array.from(e):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?Yo(e,t):void 0}}(e))||t&&e&&"number"==typeof e.length){n&&(e=n);var r=0,i=function(){};return{s:i,n:function(){return r>=e.length?{done:!0}:{done:!1,value:e[r++]}},e:function(e){throw e},f:i}}throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}var o,a=!0,s=!1;return{s:function(){n=n.call(e)},n:function(){var e=n.next();return a=e.done,e},e:function(e){s=!0,o=e},f:function(){try{a||null==n.return||n.return()}finally{if(s)throw o}}}}function Yo(e,t){(null==t||t>e.length)&&(t=e.length);for(var n=0,r=new Array(t);n<t;n++)r[n]=e[n];return r}var Go={},Jo="video",$o="voice",qo=Ri()?{data:{}}:{data:{},topology:"none"},Wo={present:0,hidden:0},zo={maxBitrate:{min:1e5,max:25e5},maxFramerate:{min:1,max:30},scaleResolutionDownBy:{min:1,max:8}},Ho=Object.keys(zo),Ko=["state","volume","simulcastEncodings"],Qo={androidInCallNotification:{title:"string",subtitle:"string",iconName:"string",disableForCustomOverride:"boolean"},disableAutoDeviceManagement:{audio:"boolean",video:"boolean"}},Xo={id:{iconPath:"string",iconPathDarkMode:"string",label:"string",tooltip:"string"}},Zo={id:{allow:"string",controlledBy:"'*' | 'owners' | string[]",csp:"string",iconURL:"string",label:"string",loading:"'eager' | 'lazy'",location:"'main' | 'sidebar'",name:"string",referrerPolicy:"string",sandbox:"string",src:"string",srcdoc:"string",shared:"string[] | 'owners' | boolean"}},ea={customIntegrations:{validate:Sa,help:ya()},customTrayButtons:{validate:ba,help:"customTrayButtons should be a dictionary of the type ".concat(JSON.stringify(Xo))},url:{validate:function(e){return"string"==typeof e},help:"url should be a string"},baseUrl:{validate:function(e){return"string"==typeof e},help:"baseUrl should be a string"},token:{validate:function(e){return"string"==typeof e},help:"token should be a string",queryString:"t"},dailyConfig:{validate:function(e,t){try{return t.validateDailyConfig(e),!0}catch(e){console.error("Failed to validate dailyConfig",e)}return!1},help:"Unsupported dailyConfig. Check error logs for detailed info."},reactNativeConfig:{validate:function(e){return Ea(e,Qo)},help:"reactNativeConfig should look like ".concat(JSON.stringify(Qo),", all fields optional")},lang:{validate:function(e){return["da","de","en-us","en","es","fi","fr","it","jp","ka","nl","no","pl","pt","pt-BR","ru","sv","tr","user"].includes(e)},help:"language not supported. Options are: da, de, en-us, en, es, fi, fr, it, jp, ka, nl, no, pl, pt, pt-BR, ru, sv, tr, user"},userName:!0,userData:{validate:function(e){try{return ha(e),!0}catch(e){return console.error(e),!1}},help:"invalid userData type provided"},startVideoOff:!0,startAudioOff:!0,activeSpeakerMode:!0,showLeaveButton:!0,showLocalVideo:!0,showParticipantsBar:!0,showFullscreenButton:!0,showUserNameChangeUI:!0,iframeStyle:!0,customLayout:!0,cssFile:!0,cssText:!0,bodyClass:!0,videoSource:{validate:function(e,t){return e instanceof MediaStreamTrack&&(t._sharedTracks.videoDeviceId=e),t._preloadCache.videoDeviceId=e,!0}},audioSource:{validate:function(e,t){return e instanceof MediaStreamTrack&&(t._sharedTracks.audioDeviceId=e),t._preloadCache.audioDeviceId=e,!0}},subscribeToTracksAutomatically:{validate:function(e,t){return t._preloadCache.subscribeToTracksAutomatically=e,!0}},theme:{validate:function(e){var t=["accent","accentText","background","backgroundAccent","baseText","border","mainAreaBg","mainAreaBgAccent","mainAreaText","supportiveText"],n=function(e){for(var n=0,r=Object.keys(e);n<r.length;n++){var i=r[n];if(!t.includes(i))return console.error('unsupported color "'.concat(i,'". Valid colors: ').concat(t.join(", "))),!1;if(!e[i].match(/^#[0-9a-f]{6}|#[0-9a-f]{3}$/i))return console.error("".concat(i,' theme color should be provided in valid hex color format. Received: "').concat(e[i],'"')),!1}return!0};return"object"===s(e)&&("light"in e&&"dark"in e||"colors"in e)?"light"in e&&"dark"in e?"colors"in e.light?"colors"in e.dark?n(e.light.colors)&&n(e.dark.colors):(console.error('Dark theme is missing "colors" property.',e),!1):(console.error('Light theme is missing "colors" property.',e),!1):n(e.colors):(console.error('Theme must contain either both "light" and "dark" properties, or "colors".',e),!1)},help:"unsupported theme configuration. Check error logs for detailed info."},layoutConfig:{validate:function(e){if("grid"in e){var t=e.grid;if("maxTilesPerPage"in t){if(!Number.isInteger(t.maxTilesPerPage))return console.error("grid.maxTilesPerPage should be an integer. You passed ".concat(t.maxTilesPerPage,".")),!1;if(t.maxTilesPerPage>49)return console.error("grid.maxTilesPerPage can't be larger than 49 without sacrificing browser performance. Please contact us at https://www.daily.co/contact to talk about your use case."),!1}if("minTilesPerPage"in t){if(!Number.isInteger(t.minTilesPerPage))return console.error("grid.minTilesPerPage should be an integer. You passed ".concat(t.minTilesPerPage,".")),!1;if(t.minTilesPerPage<1)return console.error("grid.minTilesPerPage can't be lower than 1."),!1;if("maxTilesPerPage"in t&&t.minTilesPerPage>t.maxTilesPerPage)return console.error("grid.minTilesPerPage can't be higher than grid.maxTilesPerPage."),!1}}return!0},help:"unsupported layoutConfig. Check error logs for detailed info."},receiveSettings:{validate:function(e){return pa(e,{allowAllParticipantsKey:!1})},help:ma({allowAllParticipantsKey:!1})},sendSettings:{validate:function(e,t){return!!function(e,t){try{return t.validateUpdateSendSettings(e),!0}catch(e){return console.error("Failed to validate send settings",e),!1}}(e,t)&&(t._preloadCache.sendSettings=e,!0)},help:"Invalid sendSettings provided. Check error logs for detailed info."},inputSettings:{validate:function(e,t){var n;return!!va(e)&&(t._preloadCache.inputSettings||(t._preloadCache.inputSettings={}),_a(e,null===(n=t.properties)||void 0===n?void 0:n.dailyConfig),e.audio&&(t._preloadCache.inputSettings.audio=e.audio),e.video&&(t._preloadCache.inputSettings.video=e.video),!0)},help:ga()},layout:{validate:function(e){return"custom-v1"===e||"browser"===e||"none"===e},help:'layout may only be set to "custom-v1"',queryString:"layout"},emb:{queryString:"emb"},embHref:{queryString:"embHref"},dailyJsVersion:{queryString:"dailyJsVersion"},proxy:{queryString:"proxy"},strictMode:!0,allowMultipleCallInstances:!0},ta={styles:{validate:function(e){for(var t in e)if("cam"!==t&&"screen"!==t)return!1;if(e.cam)for(var n in e.cam)if("div"!==n&&"video"!==n)return!1;if(e.screen)for(var r in e.screen)if("div"!==r&&"video"!==r)return!1;return!0},help:"styles format should be a subset of: { cam: {div: {}, video: {}}, screen: {div: {}, video: {}} }"},setSubscribedTracks:{validate:function(e,t){if(t._preloadCache.subscribeToTracksAutomatically)return!1;var n=[!0,!1,"staged"];if(n.includes(e)||!Ri()&&"avatar"===e)return!0;var r=["audio","video","screenAudio","screenVideo","rmpAudio","rmpVideo"];return function e(t){var i=arguments.length>1&&void 0!==arguments[1]&&arguments[1];for(var o in t)if("custom"===o){if(!n.includes(t[o])&&!e(t[o],!0))return!1}else{var a=!i&&!r.includes(o),s=!n.includes(t[o]);if(a||s)return!1}return!0}(e)},help:"setSubscribedTracks cannot be used when setSubscribeToTracksAutomatically is enabled, and should be of the form: "+"true".concat(Ri()?"":" | 'avatar'"," | false | 'staged' | { [audio: true|false|'staged'], [video: true|false|'staged'], [screenAudio: true|false|'staged'], [screenVideo: true|false|'staged'] }")},setAudio:!0,setVideo:!0,setScreenShare:{validate:function(e){return!1===e},help:"setScreenShare must be false, as it's only meant for stopping remote participants' screen shares"},eject:!0,updatePermissions:{validate:function(e){for(var t=0,n=Object.entries(e);t<n.length;t++){var r=b(n[t],2),i=r[0],o=r[1];switch(i){case"hasPresence":if("boolean"!=typeof o)return!1;break;case"canSend":if(o instanceof Set||o instanceof Array||Array.isArray(o)){var a,s=["video","audio","screenVideo","screenAudio","customVideo","customAudio"],c=Vo(o);try{for(c.s();!(a=c.n()).done;){var u=a.value;if(!s.includes(u))return!1}}catch(e){c.e(e)}finally{c.f()}}else if("boolean"!=typeof o)return!1;(o instanceof Array||Array.isArray(o))&&(e.canSend=new Set(o));break;case"canAdmin":if(o instanceof Set||o instanceof Array||Array.isArray(o)){var l,d=["participants","streaming","transcription"],f=Vo(o);try{for(f.s();!(l=f.n()).done;){var h=l.value;if(!d.includes(h))return!1}}catch(e){f.e(e)}finally{f.f()}}else if("boolean"!=typeof o)return!1;(o instanceof Array||Array.isArray(o))&&(e.canAdmin=new Set(o));break;default:return!1}}return!0},help:"updatePermissions can take hasPresence, canSend, and canAdmin permissions. hasPresence must be a boolean. canSend can be a boolean or an Array or Set of media types (video, audio, screenVideo, screenAudio, customVideo, customAudio). canAdmin can be a boolean or an Array or Set of admin types (participants, streaming, transcription)."}};Promise.any||(Promise.any=function(){var e=m((function*(e){return new Promise((function(t,n){var r=[];e.forEach((function(i){return Promise.resolve(i).then((function(e){t(e)})).catch((function(t){r.push(t),r.length===e.length&&n(r)}))}))}))}));return function(t){return e.apply(this,arguments)}}());var na=function(e){h(oe,e);var t,n,r,i,c,u,f,g,y,S,w,k,M,O,I,L,N,R,x,j,F,B,U,V,Y,G,J,$,q,W,z,H,K,Q,X,Z,ee,te,ne,re,ie=(ne=oe,re=function(){if("undefined"==typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"==typeof Proxy)return!0;try{return Boolean.prototype.valueOf.call(Reflect.construct(Boolean,[],(function(){}))),!0}catch(e){return!1}}(),function(){var e,t=v(ne);if(re){var n=v(this).constructor;e=Reflect.construct(t,arguments,n)}else e=t.apply(this,arguments);return p(this,e)});function oe(e){var t,n,r,i=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};if(a(this,oe),_(d(n=ie.call(this)),"startListeningForDeviceChanges",(function(){No(n.handleDeviceChange)})),_(d(n),"stopListeningForDeviceChanges",(function(){var e;e=n.handleDeviceChange,Ro()?function(e){Oo.has(e)&&(Oo.delete(e),0===Oo.size&&Po&&(navigator.mediaDevices.removeEventListener("devicechange",Po),Po=null))}(e):function(e){Io.has(e)&&(Io.delete(e),0===Io.size&&Lo&&(clearInterval(Lo),Lo=null))}(e)})),_(d(n),"handleDeviceChange",(function(e){e=e.map((function(e){return JSON.parse(JSON.stringify(e))})),n.emitDailyJSEvent({action:"available-devices-updated",availableDevices:e})})),_(d(n),"handleNativeAppStateChange",function(){var e=m((function*(e){if("destroyed"===e)return console.warn("App has been destroyed before leaving the meeting. Cleaning up all the resources!"),void(yield n.destroy());var t="active"===e;n.disableReactNativeAutoDeviceManagement("video")||(t?n.camUnmutedBeforeLosingNativeActiveState&&n.setLocalVideo(!0):(n.camUnmutedBeforeLosingNativeActiveState=n.localVideo(),n.camUnmutedBeforeLosingNativeActiveState&&n.setLocalVideo(!1)))}));return function(t){return e.apply(this,arguments)}}()),_(d(n),"handleNativeAudioFocusChange",(function(e){n.disableReactNativeAutoDeviceManagement("audio")||(n._hasNativeAudioFocus=e,n.toggleParticipantAudioBasedOnNativeAudioFocus(),n._hasNativeAudioFocus?n.micUnmutedBeforeLosingNativeAudioFocus&&n.setLocalAudio(!0):(n.micUnmutedBeforeLosingNativeAudioFocus=n.localAudio(),n.setLocalAudio(!1)))})),_(d(n),"handleNativeSystemScreenCaptureStop",(function(){n.stopScreenShare()})),n.strictMode=void 0===i.strictMode||i.strictMode,n.allowMultipleCallInstances=null!==(t=i.allowMultipleCallInstances)&&void 0!==t&&t,Object.keys(Go).length&&(n._logDuplicateInstanceAttempt(),!n.allowMultipleCallInstances)){if(n.strictMode)throw new Error("Duplicate DailyIframe instances are not allowed");console.warn("Using strictMode: false to allow multiple call instances is now deprecated. Set `allowMultipleCallInstances: true`")}if(window._daily||(window._daily={pendings:[],instances:{}}),n.callClientId=A(),r=d(n),Go[r.callClientId]=r,window._daily.instances[n.callClientId]={},n._sharedTracks={},window._daily.instances[n.callClientId].tracks=n._sharedTracks,i.dailyJsVersion=oe.version(),n._iframe=e,n._callObjectMode="none"===i.layout&&!n._iframe,n._preloadCache={subscribeToTracksAutomatically:!0,audioDeviceId:null,videoDeviceId:null,outputDeviceId:null,inputSettings:null,sendSettings:null,videoTrackForNetworkConnectivityTest:null,videoTrackForConnectionQualityTest:null},void 0!==i.showLocalVideo?n._callObjectMode?console.error("showLocalVideo is not available in call object mode"):n._showLocalVideo=!!i.showLocalVideo:n._showLocalVideo=!0,void 0!==i.showParticipantsBar?n._callObjectMode?console.error("showParticipantsBar is not available in call object mode"):n._showParticipantsBar=!!i.showParticipantsBar:n._showParticipantsBar=!0,void 0!==i.customIntegrations?n._callObjectMode?console.error("customIntegrations is not available in call object mode"):n._customIntegrations=i.customIntegrations:n._customIntegrations={},void 0!==i.customTrayButtons?n._callObjectMode?console.error("customTrayButtons is not available in call object mode"):n._customTrayButtons=i.customTrayButtons:n._customTrayButtons={},void 0!==i.activeSpeakerMode?n._callObjectMode?console.error("activeSpeakerMode is not available in call object mode"):n._activeSpeakerMode=!!i.activeSpeakerMode:n._activeSpeakerMode=!1,i.receiveSettings?n._callObjectMode?n._receiveSettings=i.receiveSettings:console.error("receiveSettings is only available in call object mode"):n._receiveSettings={},n.validateProperties(i),n.properties=Uo({},i),n._preloadCache.inputSettings||(n._preloadCache.inputSettings={}),i.inputSettings&&i.inputSettings.audio&&(n._preloadCache.inputSettings.audio=i.inputSettings.audio),i.inputSettings&&i.inputSettings.video&&(n._preloadCache.inputSettings.video=i.inputSettings.video),n._callObjectLoader=n._callObjectMode?new lo(n.callClientId):null,n._callState=Rn,n._isPreparingToJoin=!1,n._accessState={access:zn},n._meetingSessionSummary={},n._finalSummaryOfPrevSession={},n._meetingSessionState=Ma(qo,n._callObjectMode),n._nativeInCallAudioMode=Jo,n._participants={},n._isScreenSharing=!1,n._participantCounts=Wo,n._rmpPlayerState={},n._waitingParticipants={},n._network={threshold:"good",quality:100},n._activeSpeaker={},n._localAudioLevel=0,n._isLocalAudioLevelObserverRunning=!1,n._remoteParticipantsAudioLevel={},n._isRemoteParticipantsAudioLevelObserverRunning=!1,n._maxAppMessageSize=Ei,n._messageChannel=Ri()?new no:new eo,n._iframe&&(n._iframe.requestFullscreen?n._iframe.addEventListener("fullscreenchange",(function(){document.fullscreenElement===n._iframe?(n.emitDailyJSEvent({action:di}),n.sendMessageToCallMachine({action:di})):(n.emitDailyJSEvent({action:fi}),n.sendMessageToCallMachine({action:fi}))})):n._iframe.webkitRequestFullscreen&&n._iframe.addEventListener("webkitfullscreenchange",(function(){document.webkitFullscreenElement===n._iframe?(n.emitDailyJSEvent({action:di}),n.sendMessageToCallMachine({action:di})):(n.emitDailyJSEvent({action:fi}),n.sendMessageToCallMachine({action:fi}))}))),Ri()){var o=n.nativeUtils();o.addAudioFocusChangeListener&&o.removeAudioFocusChangeListener&&o.addAppStateChangeListener&&o.removeAppStateChangeListener&&o.addSystemScreenCaptureStopListener&&o.removeSystemScreenCaptureStopListener||console.warn("expected (add|remove)(AudioFocusChange|AppActiveStateChange|SystemScreenCaptureStop)Listener to be available in React Native"),n._hasNativeAudioFocus=!0,o.addAudioFocusChangeListener(n.handleNativeAudioFocusChange),o.addAppStateChangeListener(n.handleNativeAppStateChange),o.addSystemScreenCaptureStopListener(n.handleNativeSystemScreenCaptureStop)}return n._callObjectMode&&n.startListeningForDeviceChanges(),n._messageChannel.addListenerForMessagesFromCallMachine(n.handleMessageFromCallMachine,n.callClientId,d(n)),n}return l(oe,[{key:"destroy",value:(te=m((function*(){var e,t;try{yield this.leave()}catch(e){}var n=this._iframe;if(n){var r=n.parentElement;r&&r.removeChild(n)}if(this._messageChannel.removeListener(this.handleMessageFromCallMachine),Ri()){var i=this.nativeUtils();i.removeAudioFocusChangeListener(this.handleNativeAudioFocusChange),i.removeAppStateChangeListener(this.handleNativeAppStateChange),i.removeSystemScreenCaptureStopListener(this.handleNativeSystemScreenCaptureStop)}this._callObjectMode&&this.stopListeningForDeviceChanges(),this.resetMeetingDependentVars(),this._destroyed=!0,this.emitDailyJSEvent({action:"call-instance-destroyed"}),delete Go[this.callClientId],(null===(e=window)||void 0===e||null===(t=e._daily)||void 0===t?void 0:t.instances)&&delete window._daily.instances[this.callClientId],this.strictMode&&(this.callClientId=void 0)})),function(){return te.apply(this,arguments)})},{key:"isDestroyed",value:function(){return!!this._destroyed}},{key:"loadCss",value:function(e){var t=e.bodyClass,n=e.cssFile,r=e.cssText;return da(),this.sendMessageToCallMachine({action:"load-css",cssFile:this.absoluteUrl(n),bodyClass:t,cssText:r}),this}},{key:"iframe",value:function(){return da(),this._iframe}},{key:"meetingState",value:function(){return this._callState}},{key:"accessState",value:function(){return ua(this._callObjectMode,"accessState()"),this._accessState}},{key:"participants",value:function(){return this._participants}},{key:"participantCounts",value:function(){return this._participantCounts}},{key:"waitingParticipants",value:function(){return ua(this._callObjectMode,"waitingParticipants()"),this._waitingParticipants}},{key:"validateParticipantProperties",value:function(e,t){for(var n in t){if(!ta[n])throw new Error("unrecognized updateParticipant property ".concat(n));if(ta[n].validate&&!ta[n].validate(t[n],this,this._participants[e]))throw new Error(ta[n].help)}}},{key:"updateParticipant",value:function(e,t){return this._participants.local&&this._participants.local.session_id===e&&(e="local"),e&&t&&(this.validateParticipantProperties(e,t),this.sendMessageToCallMachine({action:"update-participant",id:e,properties:t})),this}},{key:"updateParticipants",value:function(e){var t=this._participants.local&&this._participants.local.session_id;for(var n in e)n===t&&(n="local"),n&&e[n]&&this.validateParticipantProperties(n,e[n]);return this.sendMessageToCallMachine({action:"update-participants",participants:e}),this}},{key:"updateWaitingParticipant",value:(ee=m((function*(){var e=this,t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};if(ua(this._callObjectMode,"updateWaitingParticipant()"),ia(this._callState,"updateWaitingParticipant()"),"string"!=typeof t||"object"!==s(n))throw new Error("updateWaitingParticipant() must take an id string and a updates object");return new Promise((function(r,i){e.sendMessageToCallMachine({action:"daily-method-update-waiting-participant",id:t,updates:n},(function(e){e.error&&i(e.error),e.id||i(new Error("unknown error in updateWaitingParticipant()")),r({id:e.id})}))}))})),function(){return ee.apply(this,arguments)})},{key:"updateWaitingParticipants",value:(Z=m((function*(){var e=this,t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};if(ua(this._callObjectMode,"updateWaitingParticipants()"),ia(this._callState,"updateWaitingParticipants()"),"object"!==s(t))throw new Error("updateWaitingParticipants() must take a mapping between ids and update objects");return new Promise((function(n,r){e.sendMessageToCallMachine({action:"daily-method-update-waiting-participants",updatesById:t},(function(e){e.error&&r(e.error),e.ids||r(new Error("unknown error in updateWaitingParticipants()")),n({ids:e.ids})}))}))})),function(){return Z.apply(this,arguments)})},{key:"requestAccess",value:(X=m((function*(){var e=this,t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},n=t.access,r=void 0===n?{level:Hn}:n,i=t.name,o=void 0===i?"":i;return ua(this._callObjectMode,"requestAccess()"),ia(this._callState,"requestAccess()"),new Promise((function(t,n){e.sendMessageToCallMachine({action:"daily-method-request-access",access:r,name:o},(function(e){e.error&&n(e.error),e.access||n(new Error("unknown error in requestAccess()")),t({access:e.access,granted:e.granted})}))}))})),function(){return X.apply(this,arguments)})},{key:"localAudio",value:function(){return this._participants.local?!["blocked","off"].includes(this._participants.local.tracks.audio.state):null}},{key:"localVideo",value:function(){return this._participants.local?!["blocked","off"].includes(this._participants.local.tracks.video.state):null}},{key:"setLocalAudio",value:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};return"forceDiscardTrack"in t&&(Ri()?(console.warn("forceDiscardTrack option not supported in React Native; ignoring"),t={}):e&&(console.warn("forceDiscardTrack option only supported when calling setLocalAudio(false); ignoring"),t={})),this.sendMessageToCallMachine({action:"local-audio",state:e,options:t}),this}},{key:"localScreenAudio",value:function(){return this._participants.local?!["blocked","off"].includes(this._participants.local.tracks.screenAudio.state):null}},{key:"localScreenVideo",value:function(){return this._participants.local?!["blocked","off"].includes(this._participants.local.tracks.screenVideo.state):null}},{key:"updateScreenShare",value:function(e){if(this._isScreenSharing)return this.sendMessageToCallMachine({action:"local-screen-update",options:e}),this;console.warn("There is no screen share in progress. Try calling startScreenShare first.")}},{key:"setLocalVideo",value:function(e){return this.sendMessageToCallMachine({action:"local-video",state:e}),this}},{key:"getReceiveSettings",value:(Q=m((function*(e){var t=this,n=(arguments.length>1&&void 0!==arguments[1]?arguments[1]:{}).showInheritedValues,r=void 0!==n&&n;if(ua(this._callObjectMode,"getReceiveSettings()"),!this._callMachineInitialized)return this._receiveSettings;switch(s(e)){case"string":return new Promise((function(n){t.sendMessageToCallMachine({action:"get-single-participant-receive-settings",id:e,showInheritedValues:r},(function(e){n(e.receiveSettings)}))}));case"undefined":return this._receiveSettings;default:throw new Error('first argument to getReceiveSettings() must be a participant id (or "base"), or there should be no arguments')}})),function(e){return Q.apply(this,arguments)})},{key:"updateReceiveSettings",value:(K=m((function*(e){var t=this;if(ua(this._callObjectMode,"updateReceiveSettings()"),!pa(e,{allowAllParticipantsKey:!0}))throw new Error(ma({allowAllParticipantsKey:!0}));return ia(this._callState,"updateReceiveSettings()","To specify receive settings earlier, use the receiveSettings config property."),new Promise((function(n){t.sendMessageToCallMachine({action:"update-receive-settings",receiveSettings:e},(function(e){n({receiveSettings:e.receiveSettings})}))}))})),function(e){return K.apply(this,arguments)})},{key:"_prepInputSettingsToPresentToUser",value:function(e){var t,n,r,i,o,a,s,c;if(e){var u={},l="none"===(null===(t=e.audio)||void 0===t||null===(n=t.processor)||void 0===n?void 0:n.type)&&(null===(r=e.audio)||void 0===r||null===(i=r.processor)||void 0===i?void 0:i._isDefaultWhenNone);if(e.audio&&!l){var d=Uo({},e.audio.processor);delete d._isDefaultWhenNone,u.audio=Uo(Uo({},e.audio),{},{processor:d})}var f="none"===(null===(o=e.video)||void 0===o||null===(a=o.processor)||void 0===a?void 0:a.type)&&(null===(s=e.video)||void 0===s||null===(c=s.processor)||void 0===c?void 0:c._isDefaultWhenNone);if(e.video&&!f){var h=Uo({},e.video.processor);delete h._isDefaultWhenNone,u.video=Uo(Uo({},e.video),{},{processor:h})}return u}}},{key:"getInputSettings",value:function(){var e=this;return da(),new Promise((function(t){t(e._getInputSettings())}))}},{key:"_getInputSettings",value:function(){var e,t,n,r,i,o,a,s,c={processor:{type:"none",_isDefaultWhenNone:!0}};this._inputSettings?(e=(null===(n=this._inputSettings)||void 0===n?void 0:n.video)||c,t=(null===(r=this._inputSettings)||void 0===r?void 0:r.audio)||c):(e=(null===(i=this._preloadCache)||void 0===i||null===(o=i.inputSettings)||void 0===o?void 0:o.video)||c,t=(null===(a=this._preloadCache)||void 0===a||null===(s=a.inputSettings)||void 0===s?void 0:s.audio)||c);var u={audio:t,video:e};return this._prepInputSettingsToPresentToUser(u)}},{key:"updateInputSettings",value:(H=m((function*(e){var t=this;return da(),va(e)?(e&&(this._preloadCache.inputSettings||(this._preloadCache.inputSettings={}),_a(e,this.properties.dailyConfig),e.audio&&(this._preloadCache.inputSettings.audio=e.audio),e.video&&(this._preloadCache.inputSettings.video=e.video)),e.video||e.audio?this._callObjectMode&&!this._callMachineInitialized?this._getInputSettings():new Promise((function(n,r){t.sendMessageToCallMachine({action:"update-input-settings",inputSettings:e},(function(e){e.error?r(e.error):n({inputSettings:t._prepInputSettingsToPresentToUser(e.inputSettings)})}))})):this._getInputSettings()):(console.error(ga()),Promise.reject(ga()))})),function(e){return H.apply(this,arguments)})},{key:"setBandwidth",value:function(e){var t=e.kbs,n=e.trackConstraints;if(da(),this._callMachineInitialized)return this.sendMessageToCallMachine({action:"set-bandwidth",kbs:t,trackConstraints:n}),this}},{key:"getDailyLang",value:function(){var e=this;if(da(),this._callMachineInitialized)return new Promise((function(t){e.sendMessageToCallMachine({action:"get-daily-lang"},(function(e){delete e.action,delete e.callbackStamp,t(e)}))}))}},{key:"setDailyLang",value:function(e){return da(),this.sendMessageToCallMachine({action:"set-daily-lang",lang:e}),this}},{key:"setProxyUrl",value:function(e){return this.sendMessageToCallMachine({action:"set-proxy-url",proxyUrl:e}),this}},{key:"setIceConfig",value:function(e){return this.sendMessageToCallMachine({action:"set-ice-config",iceConfig:e}),this}},{key:"meetingSessionSummary",value:function(){return[Un,Vn].includes(this._callState)?this._finalSummaryOfPrevSession:this._meetingSessionSummary}},{key:"getMeetingSession",value:(z=m((function*(){var e=this;return console.warn("getMeetingSession() is deprecated: use meetingSessionSummary(), which will return immediately"),ia(this._callState,"getMeetingSession()"),new Promise((function(t){e.sendMessageToCallMachine({action:"get-meeting-session"},(function(e){delete e.action,delete e.callbackStamp,t(e)}))}))})),function(){return z.apply(this,arguments)})},{key:"meetingSessionState",value:function(){return ia(this._callState,"meetingSessionState"),this._meetingSessionState}},{key:"setMeetingSessionData",value:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"replace";ua(this._callObjectMode,"setMeetingSessionData()"),ia(this._callState,"setMeetingSessionData");try{!function(e,t){new ao({data:e,mergeStrategy:t})}(e,t)}catch(e){throw console.error(e),e}try{this.sendMessageToCallMachine({action:"set-session-data",data:e,mergeStrategy:t})}catch(e){throw new Error("Error setting meeting session data: ".concat(e))}}},{key:"setUserName",value:function(e,t){var n=this;return this.properties.userName=e,new Promise((function(r){n.sendMessageToCallMachine({action:"set-user-name",name:null!=e?e:"",thisMeetingOnly:Ri()||!!t&&!!t.thisMeetingOnly},(function(e){delete e.action,delete e.callbackStamp,r(e)}))}))}},{key:"setUserData",value:(W=m((function*(e){var t=this;try{ha(e)}catch(e){throw console.error(e),e}if(this.properties.userData=e,this._callMachineInitialized)return new Promise((function(n){try{t.sendMessageToCallMachine({action:"set-user-data",userData:e},(function(e){delete e.action,delete e.callbackStamp,n(e)}))}catch(e){throw new Error("Error setting user data: ".concat(e))}}))})),function(e){return W.apply(this,arguments)})},{key:"validateAudioLevelInterval",value:function(e){if(e&&(e<100||"number"!=typeof e))throw new Error("The interval must be a number greater than or equal to 100 milliseconds.")}},{key:"startLocalAudioLevelObserver",value:function(e){var t=this;if("undefined"==typeof AudioWorkletNode&&!Ri())throw new Error("startLocalAudioLevelObserver() is not supported on this browser");if(this.validateAudioLevelInterval(e),this._callMachineInitialized)return this._isLocalAudioLevelObserverRunning=!0,new Promise((function(n,r){t.sendMessageToCallMachine({action:"start-local-audio-level-observer",interval:e},(function(e){t._isLocalAudioLevelObserverRunning=!e.error,e.error?r({error:e.error}):n()}))}));this._preloadCache.localAudioLevelObserver={enabled:!0,interval:e}}},{key:"isLocalAudioLevelObserverRunning",value:function(){return this._isLocalAudioLevelObserverRunning}},{key:"stopLocalAudioLevelObserver",value:function(){this._preloadCache.localAudioLevelObserver=null,this._localAudioLevel=0,this._isLocalAudioLevelObserverRunning=!1,this.sendMessageToCallMachine({action:"stop-local-audio-level-observer"})}},{key:"startRemoteParticipantsAudioLevelObserver",value:function(e){var t=this;if(this.validateAudioLevelInterval(e),this._callMachineInitialized)return this._isRemoteParticipantsAudioLevelObserverRunning=!0,new Promise((function(n,r){t.sendMessageToCallMachine({action:"start-remote-participants-audio-level-observer",interval:e},(function(e){t._isRemoteParticipantsAudioLevelObserverRunning=!e.error,e.error?r({error:e.error}):n()}))}));this._preloadCache.remoteParticipantsAudioLevelObserver={enabled:!0,interval:e}}},{key:"isRemoteParticipantsAudioLevelObserverRunning",value:function(){return this._isRemoteParticipantsAudioLevelObserverRunning}},{key:"stopRemoteParticipantsAudioLevelObserver",value:function(){this._preloadCache.remoteParticipantsAudioLevelObserver=null,this._remoteParticipantsAudioLevel={},this._isRemoteParticipantsAudioLevelObserverRunning=!1,this.sendMessageToCallMachine({action:"stop-remote-participants-audio-level-observer"})}},{key:"startCamera",value:(q=m((function*(){var e=this,t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};if(ua(this._callObjectMode,"startCamera()"),aa(this._callState,this._isPreparingToJoin,"startCamera()","Did you mean to use setLocalAudio() and/or setLocalVideo() instead?"),this.needsLoad())try{yield this.load(t)}catch(e){return Promise.reject(e)}else{if(this._didPreAuth){if(t.url&&t.url!==this.properties.url)return console.error("url in startCamera() is different than the one used in preAuth()"),Promise.reject();if(t.token&&t.token!==this.properties.token)return console.error("token in startCamera() is different than the one used in preAuth()"),Promise.reject()}this.validateProperties(t),this.properties=Uo(Uo({},this.properties),t)}return new Promise((function(t){e.sendMessageToCallMachine({action:"start-camera",properties:ra(e.properties,e.callClientId),preloadCache:ra(e._preloadCache,e.callClientId)},(function(e){delete e.action,delete e.callbackStamp,t(e)}))}))})),function(){return q.apply(this,arguments)})},{key:"validateCustomTrack",value:function(e,t,n){if(n&&n.length>50)throw new Error("Custom track `trackName` must not be more than 50 characters");if(t&&"music"!==t&&"speech"!==t&&!(t instanceof Object))throw new Error("Custom track `mode` must be either `music` | `speech` | `DailyMicAudioModeSettings` or `undefined`");if(n&&["cam-audio","cam-video","screen-video","screen-audio","rmpAudio","rmpVideo","customVideoDefaults"].includes(n))throw new Error("Custom track `trackName` must not match a track name already used by daily: cam-audio, cam-video, customVideoDefaults, screen-video, screen-audio, rmpAudio, rmpVideo");if(!(e instanceof MediaStreamTrack))throw new Error("Custom tracks provided must be instances of MediaStreamTrack")}},{key:"startCustomTrack",value:function(){var e=this,t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{track:track,mode:mode,trackName:trackName};return da(),ia(this._callState,"startCustomTrack()"),this.validateCustomTrack(t.track,t.mode,t.trackName),new Promise((function(n,r){e._sharedTracks.customTrack=t.track,t.track=Ai,e.sendMessageToCallMachine({action:"start-custom-track",properties:t},(function(e){e.error?r({error:e.error}):n(e.mediaTag)}))}))}},{key:"stopCustomTrack",value:function(e){var t=this;return da(),ia(this._callState,"stopCustomTrack()"),new Promise((function(n){t.sendMessageToCallMachine({action:"stop-custom-track",mediaTag:e},(function(e){n(e.mediaTag)}))}))}},{key:"setCamera",value:function(e){var t=this;return fa(),sa(this._callMachineInitialized,"setCamera()"),new Promise((function(n){t.sendMessageToCallMachine({action:"set-camera",cameraDeviceId:e},(function(e){n({device:e.device})}))}))}},{key:"setAudioDevice",value:($=m((function*(e){return fa(),this.nativeUtils().setAudioDevice(e),{deviceId:yield this.nativeUtils().getAudioDevice()}})),function(e){return $.apply(this,arguments)})},{key:"cycleCamera",value:function(){var e=this,t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};return new Promise((function(n){e.sendMessageToCallMachine({action:"cycle-camera",properties:t},(function(e){n({device:e.device})}))}))}},{key:"cycleMic",value:function(){var e=this;return da(),new Promise((function(t){e.sendMessageToCallMachine({action:"cycle-mic"},(function(e){t({device:e.device})}))}))}},{key:"getCameraFacingMode",value:function(){var e=this;return fa(),new Promise((function(t){e.sendMessageToCallMachine({action:"get-camera-facing-mode"},(function(e){t(e.facingMode)}))}))}},{key:"setInputDevicesAsync",value:(J=m((function*(e){var t=this,n=e.audioDeviceId,r=e.videoDeviceId,i=e.audioSource,o=e.videoSource;return da(),void 0!==i&&(n=i),void 0!==o&&(r=o),n&&(this._preloadCache.audioDeviceId=n,this._sharedTracks.audioDeviceId=n),r&&(this._preloadCache.videoDeviceId=r,this._sharedTracks.videoDeviceId=r),this._callObjectMode&&this.needsLoad()?{camera:{deviceId:this._preloadCache.videoDeviceId},mic:{deviceId:this._preloadCache.audioDeviceId},speaker:{deviceId:this._preloadCache.outputDeviceId}}:(n instanceof MediaStreamTrack&&(n=Ai),r instanceof MediaStreamTrack&&(r=Ai),new Promise((function(e){t.sendMessageToCallMachine({action:"set-input-devices",audioDeviceId:n,videoDeviceId:r},(function(n){delete n.action,delete n.callbackStamp,n.returnPreloadCache?e({camera:{deviceId:t._preloadCache.videoDeviceId},mic:{deviceId:t._preloadCache.audioDeviceId},speaker:{deviceId:t._preloadCache.outputDeviceId}}):e(n)}))})))})),function(e){return J.apply(this,arguments)})},{key:"setOutputDeviceAsync",value:(G=m((function*(e){var t=this,n=e.outputDeviceId;return da(),n&&(this._preloadCache.outputDeviceId=n),this._callObjectMode&&this.needsLoad()?{camera:{deviceId:this._preloadCache.videoDeviceId},mic:{deviceId:this._preloadCache.audioDeviceId},speaker:{deviceId:this._preloadCache.outputDeviceId}}:new Promise((function(e){t.sendMessageToCallMachine({action:"set-output-device",outputDeviceId:n},(function(n){delete n.action,delete n.callbackStamp,n.returnPreloadCache?e({camera:{deviceId:t._preloadCache.videoDeviceId},mic:{deviceId:t._preloadCache.audioDeviceId},speaker:{deviceId:t._preloadCache.outputDeviceId}}):e(n)}))}))})),function(e){return G.apply(this,arguments)})},{key:"getInputDevices",value:(Y=m((function*(){var e=this;return this._callObjectMode&&this.needsLoad()?{camera:{deviceId:this._preloadCache.videoDeviceId},mic:{deviceId:this._preloadCache.audioDeviceId},speaker:{deviceId:this._preloadCache.outputDeviceId}}:new Promise((function(t){e.sendMessageToCallMachine({action:"get-input-devices"},(function(n){delete n.action,delete n.callbackStamp,n.returnPreloadCache?t({camera:{deviceId:e._preloadCache.videoDeviceId},mic:{deviceId:e._preloadCache.audioDeviceId},speaker:{deviceId:e._preloadCache.outputDeviceId}}):t(n)}))}))})),function(){return Y.apply(this,arguments)})},{key:"nativeInCallAudioMode",value:function(){return fa(),this._nativeInCallAudioMode}},{key:"setNativeInCallAudioMode",value:function(e){if(fa(),[Jo,$o].includes(e)){if(e!==this._nativeInCallAudioMode)return this._nativeInCallAudioMode=e,!this.disableReactNativeAutoDeviceManagement("audio")&&oa(this._callState,this._isPreparingToJoin)&&this.nativeUtils().setAudioMode(this._nativeInCallAudioMode),this}else console.error("invalid in-call audio mode specified: ",e)}},{key:"preAuth",value:(V=m((function*(){var e=this,t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};if(ua(this._callObjectMode,"preAuth()"),aa(this._callState,this._isPreparingToJoin,"preAuth()"),this.needsLoad()&&(yield this.load(t)),!t.url)throw new Error("preAuth() requires at least a url to be provided");return this.validateProperties(t),this.properties=Uo(Uo({},this.properties),t),new Promise((function(t,n){e.sendMessageToCallMachine({action:"daily-method-preauth",properties:ra(e.properties,e.callClientId),preloadCache:ra(e._preloadCache,e.callClientId)},(function(r){return r.error?n(r.error):r.access?(e._didPreAuth=!0,void t({access:r.access})):n(new Error("unknown error in preAuth()"))}))}))})),function(){return V.apply(this,arguments)})},{key:"load",value:(U=m((function*(e){var t=this;if(this.needsLoad()){if(this._destroyed&&(this._logUseAfterDestroy(),this.strictMode))throw new Error("Use after destroy");if(e&&(this.validateProperties(e),this.properties=Uo(Uo({},this.properties),e)),!this._callObjectMode&&!this.properties.url)throw new Error("can't load iframe meeting because url property isn't set");return this._updateCallState(xn),this.emitDailyJSEvent({action:Sr}),this._callObjectMode?new Promise((function(e,n){t._callObjectLoader.cancel();var r=Date.now();t._callObjectLoader.load(t.properties.dailyConfig,(function(n){t._bundleLoadTime=n?"no-op":Date.now()-r,t._updateCallState(jn),n&&t.emitDailyJSEvent({action:wr}),e()}),(function(e,r){if(t.emitDailyJSEvent({action:Er}),!r){t._updateCallState(Vn),t.resetMeetingDependentVars();var i={action:Si,errorMsg:e.msg,error:{type:"connection-error",msg:"Failed to load call object bundle.",details:{on:"load",sourceError:e,bundleUrl:D(t.properties.dailyConfig)}}};t._maybeSendToSentry(i),t.emitDailyJSEvent(i),n(e.msg)}}))})):(this._iframe.src=P(this.assembleMeetingUrl(),this.properties.dailyConfig),new Promise((function(e,n){t._loadedCallback=function(r){t._callState!==Vn?(t._updateCallState(jn),(t.properties.cssFile||t.properties.cssText)&&t.loadCss(t.properties),e()):n(r)}})))}})),function(e){return U.apply(this,arguments)})},{key:"join",value:(B=m((function*(){var e=this,t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};this._testCallInProgress&&this.stopTestCallQuality();var n=!1;if(this.needsLoad()){this.updateIsPreparingToJoin(!0);try{yield this.load(t)}catch(e){return this.updateIsPreparingToJoin(!1),Promise.reject(e)}}else{if(n=!(!this.properties.cssFile&&!this.properties.cssText),this._didPreAuth){if(t.url&&t.url!==this.properties.url)return console.error("url in join() is different than the one used in preAuth()"),this.updateIsPreparingToJoin(!1),Promise.reject();if(t.token&&t.token!==this.properties.token)return console.error("token in join() is different than the one used in preAuth()"),this.updateIsPreparingToJoin(!1),Promise.reject()}if(t.url&&!this._callObjectMode&&t.url&&t.url!==this.properties.url)return console.error("url in join() is different than the one used in load() (".concat(this.properties.url," -> ").concat(t.url,")")),this.updateIsPreparingToJoin(!1),Promise.reject();this.validateProperties(t),this.properties=Uo(Uo({},this.properties),t)}return void 0!==t.showLocalVideo&&(this._callObjectMode?console.error("showLocalVideo is not available in callObject mode"):this._showLocalVideo=!!t.showLocalVideo),void 0!==t.showParticipantsBar&&(this._callObjectMode?console.error("showParticipantsBar is not available in callObject mode"):this._showParticipantsBar=!!t.showParticipantsBar),this._callState===Bn||this._callState===Fn?(console.warn("already joined meeting, call leave() before joining again"),void this.updateIsPreparingToJoin(!1)):(this._updateCallState(Fn,!1),this.emitDailyJSEvent({action:Mr}),this._preloadCache.inputSettings||(this._preloadCache.inputSettings={}),t.inputSettings&&t.inputSettings.audio&&(this._preloadCache.inputSettings.audio=t.inputSettings.audio),t.inputSettings&&t.inputSettings.video&&(this._preloadCache.inputSettings.video=t.inputSettings.video),this.sendMessageToCallMachine({action:"join-meeting",properties:ra(this.properties,this.callClientId),preloadCache:ra(this._preloadCache,this.callClientId)}),new Promise((function(t,r){e._joinedCallback=function(i,o){if(e._callState!==Vn){if(e._updateCallState(Bn),i)for(var a in i){if(e._callObjectMode){var s=e._callMachine().store;ko(i[a],s),To(i[a],s),Co(i[a],e._participants[a],s)}e._participants[a]=Uo({},i[a]),e.toggleParticipantAudioBasedOnNativeAudioFocus()}n&&e.loadCss(e.properties),t(i)}else r(o)}})))})),function(){return B.apply(this,arguments)})},{key:"leave",value:(F=m((function*(){var e=this;return this._testCallInProgress&&this.stopTestCallQuality(),new Promise((function(t){e._callState===Un||e._callState===Vn?t():e._callObjectLoader&&!e._callObjectLoader.loaded?(e._callObjectLoader.cancel(),e._updateCallState(Un),e.resetMeetingDependentVars(),e.emitDailyJSEvent({action:Un}),t()):(e._resolveLeave=t,e.sendMessageToCallMachine({action:"leave-meeting"}))}))})),function(){return F.apply(this,arguments)})},{key:"startScreenShare",value:(j=m((function*(){var e=this,t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};if(sa(this._callMachineInitialized,"startScreenShare()"),t.screenVideoSendSettings&&this._validateVideoSendSettings("screenVideo",t.screenVideoSendSettings),t.mediaStream&&(this._sharedTracks.screenMediaStream=t.mediaStream,t.mediaStream=Ai),"undefined"!=typeof DailyNativeUtils&&void 0!==DailyNativeUtils.isIOS&&DailyNativeUtils.isIOS){var n=this.nativeUtils();if(yield n.isScreenBeingCaptured())return void this.emitDailyJSEvent({action:bi,type:"screen-share-error",errorMsg:"Could not start the screen sharing. The screen is already been captured!"});n.setSystemScreenCaptureStartCallback((function(){n.setSystemScreenCaptureStartCallback(null),e.sendMessageToCallMachine({action:Ti,captureOptions:t})})),n.presentSystemScreenCapturePrompt()}else this.sendMessageToCallMachine({action:Ti,captureOptions:t})})),function(){return j.apply(this,arguments)})},{key:"stopScreenShare",value:function(){sa(this._callMachineInitialized,"stopScreenShare()"),this.sendMessageToCallMachine({action:"local-screen-stop"})}},{key:"startRecording",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};this.sendMessageToCallMachine(Uo({action:"local-recording-start"},e))}},{key:"updateRecording",value:function(e){var t=e.layout,n=void 0===t?{preset:"default"}:t,r=e.instanceId;this.sendMessageToCallMachine({action:"daily-method-update-recording",layout:n,instanceId:r})}},{key:"stopRecording",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};this.sendMessageToCallMachine(Uo({action:"local-recording-stop"},e))}},{key:"startLiveStreaming",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};this.sendMessageToCallMachine(Uo({action:"daily-method-start-live-streaming"},e))}},{key:"updateLiveStreaming",value:function(e){var t=e.layout,n=void 0===t?{preset:"default"}:t,r=e.instanceId;this.sendMessageToCallMachine({action:"daily-method-update-live-streaming",layout:n,instanceId:r})}},{key:"addLiveStreamingEndpoints",value:function(e){var t=e.endpoints,n=e.instanceId;this.sendMessageToCallMachine({action:Mi,endpointsOp:"add-endpoints",endpoints:t,instanceId:n})}},{key:"removeLiveStreamingEndpoints",value:function(e){var t=e.endpoints,n=e.instanceId;this.sendMessageToCallMachine({action:Mi,endpointsOp:"remove-endpoints",endpoints:t,instanceId:n})}},{key:"stopLiveStreaming",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};this.sendMessageToCallMachine(Uo({action:"daily-method-stop-live-streaming"},e))}},{key:"validateDailyConfig",value:function(e){e.camSimulcastEncodings&&(console.warn("camSimulcastEncodings is deprecated. Use sendSettings, found in DailyCallOptions, to provide camera simulcast settings."),this.validateSimulcastEncodings(e.camSimulcastEncodings)),e.screenSimulcastEncodings&&console.warn("screenSimulcastEncodings is deprecated. Use sendSettings, found in DailyCallOptions, to provide screen simulcast settings."),Yi()&&e.noAutoDefaultDeviceChange&&console.warn("noAutoDefaultDeviceChange is not supported on Android, and will be ignored.")}},{key:"validateSimulcastEncodings",value:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null,n=arguments.length>2&&void 0!==arguments[2]&&arguments[2];if(e){if(!(e instanceof Array||Array.isArray(e)))throw new Error("encodings must be an Array");if(!Ta(e.length,1,3))throw new Error("encodings must be an Array with between 1 to ".concat(3," layers"));for(var r=0;r<e.length;r++){var i=e[r];for(var o in this._validateEncodingLayerHasValidProperties(i),i)if(Ho.includes(o)){if("number"!=typeof i[o])throw new Error("".concat(o," must be a number"));if(t){var a=t[o],s=a.min,c=a.max;if(!Ta(i[o],s,c))throw new Error("".concat(o," value not in range. valid range: ").concat(s," to ").concat(c))}}else if(!["active","scalabilityMode"].includes(o))throw new Error("Invalid key ".concat(o,", valid keys are:")+Object.values(Ho));if(n&&!i.hasOwnProperty("maxBitrate"))throw new Error("maxBitrate is not specified")}}}},{key:"startRemoteMediaPlayer",value:(x=m((function*(e){var t=this,n=e.url,r=e.settings,i=void 0===r?{state:Di.PLAY}:r;try{!function(e){if("string"!=typeof e)throw new Error('url parameter must be "string" type')}(n),ka(i),function(e){for(var t in e)if(!Ko.includes(t))throw new Error("Invalid key ".concat(t,", valid keys are: ").concat(Ko));e.simulcastEncodings&&this.validateSimulcastEncodings(e.simulcastEncodings,zo,!0)}(i)}catch(e){throw console.error("invalid argument Error: ".concat(e)),console.error('startRemoteMediaPlayer arguments must be of the form:\n  { url: "playback url",\n  settings?:\n  {state: "play"|"pause", simulcastEncodings?: [{}] } }'),e}return new Promise((function(e,r){t.sendMessageToCallMachine({action:"daily-method-start-remote-media-player",url:n,settings:i},(function(t){t.error?r({error:t.error,errorMsg:t.errorMsg}):e({session_id:t.session_id,remoteMediaPlayerState:{state:t.state,settings:t.settings}})}))}))})),function(e){return x.apply(this,arguments)})},{key:"stopRemoteMediaPlayer",value:(R=m((function*(e){var t=this;if("string"!=typeof e)throw new Error(" remotePlayerID must be of type string");return new Promise((function(n,r){t.sendMessageToCallMachine({action:"daily-method-stop-remote-media-player",session_id:e},(function(e){e.error?r({error:e.error,errorMsg:e.errorMsg}):n()}))}))})),function(e){return R.apply(this,arguments)})},{key:"updateRemoteMediaPlayer",value:(N=m((function*(e){var t=this,n=e.session_id,r=e.settings;try{ka(r)}catch(e){throw console.error("invalid argument Error: ".concat(e)),console.error('updateRemoteMediaPlayer arguments must be of the form:\n  session_id: "participant session",\n  { settings?: {state: "play"|"pause"} }'),e}return new Promise((function(e,i){t.sendMessageToCallMachine({action:"daily-method-update-remote-media-player",session_id:n,settings:r},(function(t){t.error?i({error:t.error,errorMsg:t.errorMsg}):e({session_id:t.session_id,remoteMediaPlayerState:{state:t.state,settings:t.settings}})}))}))})),function(e){return N.apply(this,arguments)})},{key:"startTranscription",value:function(e){ia(this._callState,"startTranscription()"),this.sendMessageToCallMachine(Uo({action:"daily-method-start-transcription"},e))}},{key:"updateTranscription",value:function(e){if(ia(this._callState,"updateTranscription()"),!e)throw new Error("updateTranscription Error: options is mandatory");if("object"!==s(e))throw new Error("updateTranscription Error: options must be object type");if(e.participants&&!Array.isArray(e.participants))throw new Error("updateTranscription Error: participants must be an array");this.sendMessageToCallMachine(Uo({action:"daily-method-update-transcription"},e))}},{key:"stopTranscription",value:function(e){if(ia(this._callState,"stopTranscription()"),e&&"object"!==s(e))throw new Error("stopTranscription Error: options must be object type");if(e&&!e.instanceId)throw new Error('"instanceId" not provided');this.sendMessageToCallMachine(Uo({action:"daily-method-stop-transcription"},e))}},{key:"startDialOut",value:(L=m((function*(e){var t=this;ia(this._callState,"startDialOut()");var n=function(e){if(e){if(!Array.isArray(e))throw new Error("Error starting dial out: audio codec must be an array");if(e.length<=0)throw new Error("Error starting dial out: audio codec array specified but empty");e.forEach((function(e){if("string"!=typeof e)throw new Error("Error starting dial out: audio codec must be a string");if("OPUS"!==e&&"PCMU"!==e&&"PCMA"!==e&&"G722"!==e)throw new Error("Error starting dial out: audio codec must be one of OPUS, PCMU, PCMA, G722")}))}};if(!e.sipUri&&!e.phoneNumber)throw new Error("Error starting dial out: either a sip uri or phone number must be provided");if(e.sipUri&&e.phoneNumber)throw new Error("Error starting dial out: only one of sip uri or phone number must be provided");if(e.sipUri){if("string"!=typeof e.sipUri)throw new Error("Error starting dial out: sipUri must be a string");if(!e.sipUri.startsWith("sip:"))throw new Error("Error starting dial out: Invalid SIP URI, must start with 'sip:'");if(e.video&&"boolean"!=typeof e.video)throw new Error("Error starting dial out: video must be a boolean value");!function(e){if(e&&(n(e.audio),e.video)){if(!Array.isArray(e.video))throw new Error("Error starting dial out: video codec must be an array");if(e.video.length<=0)throw new Error("Error starting dial out: video codec array specified but empty");e.video.forEach((function(e){if("string"!=typeof e)throw new Error("Error starting dial out: video codec must be a string");if("H264"!==e&&"VP8"!==e)throw new Error("Error starting dial out: video codec must be H264 or VP8")}))}}(e.codecs)}if(e.phoneNumber){if("string"!=typeof e.phoneNumber)throw new Error("Error starting dial out: phoneNumber must be a string");if(!/^\+\d{1,}$/.test(e.phoneNumber))throw new Error("Error starting dial out: Invalid phone number, must be valid phone number as per E.164");e.codecs&&n(e.codecs.audio)}if(e.callerId){if("string"!=typeof e.callerId)throw new Error("Error starting dial out: callerId must be a string");if(e.sipUri)throw new Error("Error starting dial out: callerId not allowed with sipUri")}if(e.displayName){if("string"!=typeof e.displayName)throw new Error("Error starting dial out: displayName must be a string");if(e.displayName.length>=200)throw new Error("Error starting dial out: displayName length must be less than 200")}if(e.userId){if("string"!=typeof e.userId)throw new Error("Error starting dial out: userId must be a string");if(e.userId.length>36)throw new Error("Error starting dial out: userId length must be less than or equal to 36")}return new Promise((function(n,r){t.sendMessageToCallMachine(Uo({action:"dialout-start"},e),(function(e){e.error?r(e.error):n(e)}))}))})),function(e){return L.apply(this,arguments)})},{key:"stopDialOut",value:function(e){var t=this;return ia(this._callState,"stopDialOut()"),new Promise((function(n,r){t.sendMessageToCallMachine(Uo({action:"dialout-stop"},e),(function(e){e.error?r(e.error):n(e)}))}))}},{key:"sipCallTransfer",value:(I=m((function*(e){var t=this;if(ia(this._callState,"sipCallTransfer()"),!e)throw new Error("sipCallTransfer() requires a sessionId and toEndPoint");return e.useSipRefer=!1,wa(e,"sipCallTransfer"),new Promise((function(n,r){t.sendMessageToCallMachine(Uo({action:Li},e),(function(e){e.error?r(e.error):n(e)}))}))})),function(e){return I.apply(this,arguments)})},{key:"sipRefer",value:(O=m((function*(e){var t=this;if(ia(this._callState,"sipRefer()"),!e)throw new Error("sessionId and toEndPoint are mandatory parameter");return e.useSipRefer=!0,wa(e,"sipRefer"),new Promise((function(n,r){t.sendMessageToCallMachine(Uo({action:Li},e),(function(e){e.error?r(e.error):n(e)}))}))})),function(e){return O.apply(this,arguments)})},{key:"sendDTMF",value:(M=m((function*(e){var t=this;return ia(this._callState,"sendDTMF()"),function(e){var t=e.sessionId,n=e.tones;if(!t||!n)throw new Error("sessionId and tones are mandatory parameter");if("string"!=typeof t||"string"!=typeof n)throw new Error("sessionId and tones should be of string type");if(n.length>20)throw new Error("tones string must be upto 20 characters");var r=n.match(/[^0-9A-D*#]/g);if(r&&r[0])throw new Error("".concat(r[0]," is not valid DTMF tone"))}(e),new Promise((function(n,r){t.sendMessageToCallMachine(Uo({action:"send-dtmf"},e),(function(e){e.error?r(e.error):n(e)}))}))})),function(e){return M.apply(this,arguments)})},{key:"getNetworkStats",value:function(){var e=this;return this._callState!==Bn?{stats:{latest:{}}}:new Promise((function(t){e.sendMessageToCallMachine({action:"get-calc-stats"},(function(n){t(Uo({stats:n.stats},e._network))}))}))}},{key:"testWebsocketConnectivity",value:(k=m((function*(){var e=this;if(ca(this._testCallInProgress,"testWebsocketConnectivity()"),this.needsLoad())try{yield this.load()}catch(e){return Promise.reject(e)}return new Promise((function(t,n){e.sendMessageToCallMachine({action:"test-websocket-connectivity"},(function(e){e.error?n(e.error):t(e.results)}))}))})),function(){return k.apply(this,arguments)})},{key:"abortTestWebsocketConnectivity",value:function(){this.sendMessageToCallMachine({action:"abort-test-websocket-connectivity"})}},{key:"_validateVideoTrackForNetworkTests",value:function(e){return e?e instanceof MediaStreamTrack?!!function(e,t){var n=t.isLocalScreenVideo;return e&&"live"===e.readyState&&!function(e,t){return(!t.isLocalScreenVideo||"Chrome"!==Ji())&&e.muted&&!xo.has(e.id)}(e,{isLocalScreenVideo:n})}(e,{isLocalScreenVideo:!1})||(console.error("Video track is not playable. This test needs a live video track."),!1):(console.error("Video track needs to be of type `MediaStreamTrack`."),!1):(console.error("Missing video track. You must provide a video track in order to run this test."),!1)}},{key:"testCallQuality",value:(w=m((function*(){var e=this;da(),ua(this._callObjectMode,"testCallQuality()"),sa(this._callMachineInitialized,"testCallQuality()",null,!0),aa(this._callState,this._isPreparingToJoin,"testCallQuality()");var t=this._testCallAlreadyInProgress,n=function(n){t||(e._testCallInProgress=n)};if(n(!0),this.needsLoad())try{var r=this._callState;yield this.load(),this._callState=r}catch(e){return n(!1),Promise.reject(e)}return new Promise((function(t){e.sendMessageToCallMachine({action:"test-call-quality",dailyJsVersion:e.properties.dailyJsVersion},(function(r){var i=r.results,a=i.result,s=o(i,jo);if("failed"===a){var c,u=Uo({},s);null!==(c=s.error)&&void 0!==c&&c.details?(s.error.details=JSON.parse(s.error.details),u.error=Uo(Uo({},u.error),{},{details:Uo({},u.error.details)}),u.error.details.duringTest="testCallQuality"):(u.error=u.error?Uo({},u.error):{},u.error.details={duringTest:"testCallQuality"}),e._maybeSendToSentry(u)}n(!1),t(Uo({result:a},s))}))}))})),function(){return w.apply(this,arguments)})},{key:"stopTestCallQuality",value:function(){this.sendMessageToCallMachine({action:"stop-test-call-quality"})}},{key:"testConnectionQuality",value:(S=m((function*(e){var t;Ri()?(console.warn("testConnectionQuality() is deprecated: use testPeerToPeerCallQuality() instead"),t=yield this.testPeerToPeerCallQuality(e)):(console.warn("testConnectionQuality() is deprecated: use testCallQuality() instead"),t=yield this.testCallQuality());var n={result:t.result,secondsElapsed:t.secondsElapsed};return t.data&&(n.data={maxRTT:t.data.maxRoundTripTime,packetLoss:t.data.avgRecvPacketLoss}),n})),function(e){return S.apply(this,arguments)})},{key:"testPeerToPeerCallQuality",value:(y=m((function*(e){var t=this;if(ca(this._testCallInProgress,"testPeerToPeerCallQuality()"),this.needsLoad())try{yield this.load()}catch(e){return Promise.reject(e)}var n=e.videoTrack,r=e.duration;if(!this._validateVideoTrackForNetworkTests(n))throw new Error("Video track error");return this._sharedTracks.videoTrackForConnectionQualityTest=n,new Promise((function(e,n){t.sendMessageToCallMachine({action:"test-p2p-call-quality",duration:r},(function(t){t.error?n(t.error):e(t.results)}))}))})),function(e){return y.apply(this,arguments)})},{key:"stopTestConnectionQuality",value:function(){Ri()?(console.warn("stopTestConnectionQuality() is deprecated: use testPeerToPeerCallQuality() and stopTestPeerToPeerCallQuality() instead"),this.stopTestPeerToPeerCallQuality()):(console.warn("stopTestConnectionQuality() is deprecated: use testCallQuality() and stopTestCallQuality() instead"),this.stopTestCallQuality())}},{key:"stopTestPeerToPeerCallQuality",value:function(){this.sendMessageToCallMachine({action:"stop-test-p2p-call-quality"})}},{key:"testNetworkConnectivity",value:(g=m((function*(e){var t=this;if(ca(this._testCallInProgress,"testNetworkConnectivity()"),this.needsLoad())try{yield this.load()}catch(e){return Promise.reject(e)}if(!this._validateVideoTrackForNetworkTests(e))throw new Error("Video track error");return this._sharedTracks.videoTrackForNetworkConnectivityTest=e,new Promise((function(e,n){t.sendMessageToCallMachine({action:"test-network-connectivity"},(function(t){t.error?n(t.error):e(t.results)}))}))})),function(e){return g.apply(this,arguments)})},{key:"abortTestNetworkConnectivity",value:function(){this.sendMessageToCallMachine({action:"abort-test-network-connectivity"})}},{key:"getCpuLoadStats",value:function(){var e=this;return new Promise((function(t){e._callState===Bn?e.sendMessageToCallMachine({action:"get-cpu-load-stats"},(function(e){t(e.cpuStats)})):t({cpuLoadState:void 0,cpuLoadStateReason:void 0,stats:{}})}))}},{key:"_validateEncodingLayerHasValidProperties",value:function(e){var t;if(!((null===(t=Object.keys(e))||void 0===t?void 0:t.length)>0))throw new Error("Empty encoding is not allowed. At least one of these valid keys should be specified:"+Object.values(Ho))}},{key:"_validateVideoSendSettings",value:function(e,t){var n="screenVideo"===e?["default-screen-video","detail-optimized","motion-optimized","motion-and-detail-balanced"]:["default-video","bandwidth-optimized","bandwidth-and-quality-balanced","quality-optimized","adaptive-2-layers","adaptive-3-layers"],r="Video send settings should be either an object or one of the supported presets: ".concat(n.join());if("string"==typeof t){if(!n.includes(t))throw new Error(r)}else{if("object"!==s(t))throw new Error(r);if(!t.maxQuality&&!t.encodings&&void 0===t.allowAdaptiveLayers)throw new Error("Video send settings must contain at least maxQuality, allowAdaptiveLayers or encodings attribute");if(t.maxQuality&&-1===["low","medium","high"].indexOf(t.maxQuality))throw new Error("maxQuality must be either low, medium or high");if(t.encodings){var i=!1;switch(Object.keys(t.encodings).length){case 1:i=!t.encodings.low;break;case 2:i=!t.encodings.low||!t.encodings.medium;break;case 3:i=!t.encodings.low||!t.encodings.medium||!t.encodings.high;break;default:i=!0}if(i)throw new Error("Encodings must be defined as: low, low and medium, or low, medium and high.");t.encodings.low&&this._validateEncodingLayerHasValidProperties(t.encodings.low),t.encodings.medium&&this._validateEncodingLayerHasValidProperties(t.encodings.medium),t.encodings.high&&this._validateEncodingLayerHasValidProperties(t.encodings.high)}}}},{key:"validateUpdateSendSettings",value:function(e){var t=this;if(!e||0===Object.keys(e).length)throw new Error("Send settings must contain at least information for one track!");Object.entries(e).forEach((function(e){var n=b(e,2),r=n[0],i=n[1];t._validateVideoSendSettings(r,i)}))}},{key:"updateSendSettings",value:function(e){var t=this;return this.validateUpdateSendSettings(e),this.needsLoad()?(this._preloadCache.sendSettings=e,{sendSettings:this._preloadCache.sendSettings}):new Promise((function(n,r){t.sendMessageToCallMachine({action:"update-send-settings",sendSettings:e},(function(e){e.error?r(e.error):n(e.sendSettings)}))}))}},{key:"getSendSettings",value:function(){return this._sendSettings||this._preloadCache.sendSettings}},{key:"getLocalAudioLevel",value:function(){return this._localAudioLevel}},{key:"getRemoteParticipantsAudioLevel",value:function(){return this._remoteParticipantsAudioLevel}},{key:"getActiveSpeaker",value:function(){return da(),this._activeSpeaker}},{key:"setActiveSpeakerMode",value:function(e){return da(),this.sendMessageToCallMachine({action:"set-active-speaker-mode",enabled:e}),this}},{key:"activeSpeakerMode",value:function(){return da(),this._activeSpeakerMode}},{key:"subscribeToTracksAutomatically",value:function(){return this._preloadCache.subscribeToTracksAutomatically}},{key:"setSubscribeToTracksAutomatically",value:function(e){return ia(this._callState,"setSubscribeToTracksAutomatically()","Use the subscribeToTracksAutomatically configuration property."),this._preloadCache.subscribeToTracksAutomatically=e,this.sendMessageToCallMachine({action:"daily-method-subscribe-to-tracks-automatically",enabled:e}),this}},{key:"enumerateDevices",value:(f=m((function*(){var e=this;if(this._callObjectMode){var t=yield navigator.mediaDevices.enumerateDevices();return"Firefox"===Ji()&&$i().major>115&&$i().major<123&&(t=t.filter((function(e){return"audiooutput"!==e.kind}))),{devices:t.map((function(e){var t=JSON.parse(JSON.stringify(e));if(!Ri()&&"videoinput"===e.kind&&e.getCapabilities){var n,r=e.getCapabilities();t.facing=(null==r||null===(n=r.facingMode)||void 0===n?void 0:n.length)>=1?r.facingMode[0]:void 0}return t}))}}return new Promise((function(t){e.sendMessageToCallMachine({action:"enumerate-devices"},(function(e){t({devices:e.devices})}))}))})),function(){return f.apply(this,arguments)})},{key:"sendAppMessage",value:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"*";if(ia(this._callState,"sendAppMessage()"),JSON.stringify(e).length>this._maxAppMessageSize)throw new Error("Message data too large. Max size is "+this._maxAppMessageSize);return this.sendMessageToCallMachine({action:"app-msg",data:e,to:t}),this}},{key:"addFakeParticipant",value:function(e){return da(),ia(this._callState,"addFakeParticipant()"),this.sendMessageToCallMachine(Uo({action:"add-fake-participant"},e)),this}},{key:"setShowNamesMode",value:function(e){return la(this._callObjectMode,"setShowNamesMode()"),da(),e&&"always"!==e&&"never"!==e?(console.error('setShowNamesMode argument should be "always", "never", or false'),this):(this.sendMessageToCallMachine({action:"set-show-names",mode:e}),this)}},{key:"setShowLocalVideo",value:function(){var e=!(arguments.length>0&&void 0!==arguments[0])||arguments[0];return la(this._callObjectMode,"setShowLocalVideo()"),da(),ia(this._callState,"setShowLocalVideo()"),"boolean"!=typeof e?(console.error("setShowLocalVideo only accepts a boolean value"),this):(this.sendMessageToCallMachine({action:"set-show-local-video",show:e}),this._showLocalVideo=e,this)}},{key:"showLocalVideo",value:function(){return la(this._callObjectMode,"showLocalVideo()"),da(),this._showLocalVideo}},{key:"setShowParticipantsBar",value:function(){var e=!(arguments.length>0&&void 0!==arguments[0])||arguments[0];return la(this._callObjectMode,"setShowParticipantsBar()"),da(),ia(this._callState,"setShowParticipantsBar()"),"boolean"!=typeof e?(console.error("setShowParticipantsBar only accepts a boolean value"),this):(this.sendMessageToCallMachine({action:"set-show-participants-bar",show:e}),this._showParticipantsBar=e,this)}},{key:"showParticipantsBar",value:function(){return la(this._callObjectMode,"showParticipantsBar()"),da(),this._showParticipantsBar}},{key:"customIntegrations",value:function(){return da(),la(this._callObjectMode,"customIntegrations()"),this._customIntegrations}},{key:"setCustomIntegrations",value:function(e){return da(),la(this._callObjectMode,"setCustomIntegrations()"),ia(this._callState,"setCustomIntegrations()"),Sa(e)?(this.sendMessageToCallMachine({action:"set-custom-integrations",integrations:e}),this._customIntegrations=e,this):this}},{key:"startCustomIntegrations",value:function(e){var t=this;if(da(),la(this._callObjectMode,"startCustomIntegrations()"),ia(this._callState,"startCustomIntegrations()"),Array.isArray(e)&&e.some((function(e){return"string"!=typeof e}))||!Array.isArray(e)&&"string"!=typeof e)return console.error("startCustomIntegrations() only accepts string | string[]"),this;var n="string"==typeof e?[e]:e,r=n.filter((function(e){return!(e in t._customIntegrations)}));return r.length?(console.error("Can't find custom integration(s): \"".concat(r.join(", "),'"')),this):(this.sendMessageToCallMachine({action:"start-custom-integrations",ids:n}),this)}},{key:"stopCustomIntegrations",value:function(e){var t=this;if(da(),la(this._callObjectMode,"stopCustomIntegrations()"),ia(this._callState,"stopCustomIntegrations()"),Array.isArray(e)&&e.some((function(e){return"string"!=typeof e}))||!Array.isArray(e)&&"string"!=typeof e)return console.error("stopCustomIntegrations() only accepts string | string[]"),this;var n="string"==typeof e?[e]:e,r=n.filter((function(e){return!(e in t._customIntegrations)}));return r.length?(console.error("Can't find custom integration(s): \"".concat(r.join(", "),'"')),this):(this.sendMessageToCallMachine({action:"stop-custom-integrations",ids:n}),this)}},{key:"customTrayButtons",value:function(){return la(this._callObjectMode,"customTrayButtons()"),da(),this._customTrayButtons}},{key:"updateCustomTrayButtons",value:function(e){return la(this._callObjectMode,"updateCustomTrayButtons()"),da(),ia(this._callState,"updateCustomTrayButtons()"),ba(e)?(this.sendMessageToCallMachine({action:"update-custom-tray-buttons",btns:e}),this._customTrayButtons=e,this):(console.error("updateCustomTrayButtons only accepts a dictionary of the type ".concat(JSON.stringify(Xo))),this)}},{key:"theme",value:function(){return la(this._callObjectMode,"theme()"),this.properties.theme}},{key:"setTheme",value:function(e){var t=this;return la(this._callObjectMode,"setTheme()"),new Promise((function(n,r){try{t.validateProperties({theme:e}),t.properties.theme=Uo({},e),t.sendMessageToCallMachine({action:"set-theme",theme:t.properties.theme});try{t.emitDailyJSEvent({action:br,theme:t.properties.theme})}catch(e){console.log("could not emit 'theme-updated'",e)}n(t.properties.theme)}catch(e){r(e)}}))}},{key:"requestFullscreen",value:(u=m((function*(){if(da(),this._iframe&&!document.fullscreenElement&&ji())try{(yield this._iframe.requestFullscreen)?this._iframe.requestFullscreen():this._iframe.webkitRequestFullscreen()}catch(e){console.log("could not make video call fullscreen",e)}})),function(){return u.apply(this,arguments)})},{key:"exitFullscreen",value:function(){da(),document.fullscreenElement?document.exitFullscreen():document.webkitFullscreenElement&&document.webkitExitFullscreen()}},{key:"getSidebarView",value:(c=m((function*(){var e=this;return this._callObjectMode?(console.error("getSidebarView is not available in callObject mode"),Promise.resolve(null)):new Promise((function(t){e.sendMessageToCallMachine({action:"get-sidebar-view"},(function(e){t(e.view)}))}))})),function(){return c.apply(this,arguments)})},{key:"setSidebarView",value:function(e){return this._callObjectMode?(console.error("setSidebarView is not available in callObject mode"),this):(this.sendMessageToCallMachine({action:"set-sidebar-view",view:e}),this)}},{key:"room",value:(i=m((function*(){var e=this,t=(arguments.length>0&&void 0!==arguments[0]?arguments[0]:{}).includeRoomConfigDefaults,n=void 0===t||t;return this._accessState.access===zn||this.needsLoad()?this.properties.url?{roomUrlPendingJoin:this.properties.url}:null:new Promise((function(t){e.sendMessageToCallMachine({action:"lib-room-info",includeRoomConfigDefaults:n},(function(e){delete e.action,delete e.callbackStamp,t(e)}))}))})),function(){return i.apply(this,arguments)})},{key:"geo",value:(r=m((function*(){try{var e=yield fetch("https://gs.daily.co/_ks_/x-swsl/:");return{current:(yield e.json()).geo}}catch(e){return console.error("geo lookup failed",e),{current:""}}})),function(){return r.apply(this,arguments)})},{key:"setNetworkTopology",value:(n=m((function*(e){var t=this;return da(),ia(this._callState,"setNetworkTopology()"),new Promise((function(n,r){t.sendMessageToCallMachine({action:"set-network-topology",opts:e},(function(e){e.error?r({error:e.error}):n({workerId:e.workerId})}))}))})),function(e){return n.apply(this,arguments)})},{key:"getNetworkTopology",value:(t=m((function*(){var e=this;return new Promise((function(t,n){e.needsLoad()&&t({topology:"none"}),e.sendMessageToCallMachine({action:"get-network-topology"},(function(e){e.error?n({error:e.error}):t({topology:e.topology})}))}))})),function(){return t.apply(this,arguments)})},{key:"setPlayNewParticipantSound",value:function(e){if(da(),"number"!=typeof e&&!0!==e&&!1!==e)throw new Error("argument to setShouldPlayNewParticipantSound should be true, false, or a number, but is ".concat(e));this.sendMessageToCallMachine({action:"daily-method-set-play-ding",arg:e})}},{key:"on",value:function(e,t){return E().prototype.on.call(this,e,t)}},{key:"once",value:function(e,t){return E().prototype.once.call(this,e,t)}},{key:"off",value:function(e,t){return E().prototype.off.call(this,e,t)}},{key:"validateProperties",value:function(e){for(var t in e){if(!ea[t])throw new Error("unrecognized property '".concat(t,"'"));if(ea[t].validate&&!ea[t].validate(e[t],this))throw new Error("property '".concat(t,"': ").concat(ea[t].help))}}},{key:"assembleMeetingUrl",value:function(){var e,t,n=Uo(Uo({},this.properties),{},{emb:this.callClientId,embHref:encodeURIComponent(window.location.href),proxy:null!==(e=this.properties.dailyConfig)&&void 0!==e&&e.proxyUrl?encodeURIComponent(null===(t=this.properties.dailyConfig)||void 0===t?void 0:t.proxyUrl):void 0}),r=n.url.match(/\?/)?"&":"?";return n.url+r+Object.keys(ea).filter((function(e){return ea[e].queryString&&void 0!==n[e]})).map((function(e){return"".concat(ea[e].queryString,"=").concat(n[e])})).join("&")}},{key:"needsLoad",value:function(){return[Rn,xn,Un,Vn].includes(this._callState)}},{key:"sendMessageToCallMachine",value:function(e,t){if(this._destroyed&&(this._logUseAfterDestroy(),this.strictMode))throw new Error("Use after destroy");this._messageChannel.sendMessageToCallMachine(e,t,this.callClientId,this._iframe)}},{key:"forwardPackagedMessageToCallMachine",value:function(e){this._messageChannel.forwardPackagedMessageToCallMachine(e,this._iframe,this.callClientId)}},{key:"addListenerForPackagedMessagesFromCallMachine",value:function(e){return this._messageChannel.addListenerForPackagedMessagesFromCallMachine(e,this.callClientId)}},{key:"removeListenerForPackagedMessagesFromCallMachine",value:function(e){this._messageChannel.removeListenerForPackagedMessagesFromCallMachine(e)}},{key:"handleMessageFromCallMachine",value:function(e){switch(e.action){case mr:this.sendMessageToCallMachine(Uo({action:yr},this.properties));break;case"call-machine-initialized":this._callMachineInitialized=!0;var t={action:Ci,level:"log",code:1011,stats:{event:"bundle load",time:"no-op"===this._bundleLoadTime?0:this._bundleLoadTime,preLoaded:"no-op"===this._bundleLoadTime,url:D(this.properties.dailyConfig)}};this.sendMessageToCallMachine(t),this._delayDuplicateInstanceLog&&this._logDuplicateInstanceAttempt();break;case wr:this._loadedCallback&&(this._loadedCallback(),this._loadedCallback=null),this.emitDailyJSEvent(e);break;case Cr:var n,r=Uo({},e);delete r.internal,this._maxAppMessageSize=(null===(n=e.internal)||void 0===n?void 0:n._maxAppMessageSize)||Ei,this._joinedCallback&&(this._joinedCallback(e.participants),this._joinedCallback=null),this.emitDailyJSEvent(r);break;case Or:case Pr:if(this._callState===Un)return;if(e.participant&&e.participant.session_id){var i=e.participant.local?"local":e.participant.session_id;if(this._callObjectMode){var a=this._callMachine().store;ko(e.participant,a),To(e.participant,a),Co(e.participant,this._participants[i],a)}try{this.maybeParticipantTracksStopped(this._participants[i],e.participant),this.maybeParticipantTracksStarted(this._participants[i],e.participant),this.maybeEventRecordingStopped(this._participants[i],e.participant),this.maybeEventRecordingStarted(this._participants[i],e.participant)}catch(e){console.error("track events error",e)}this.compareEqualForParticipantUpdateEvent(e.participant,this._participants[i])||(this._participants[i]=Uo({},e.participant),this.toggleParticipantAudioBasedOnNativeAudioFocus(),this.emitDailyJSEvent(e))}break;case Dr:if(e.participant&&e.participant.session_id){var s=this._participants[e.participant.session_id];s&&this.maybeParticipantTracksStopped(s,null),delete this._participants[e.participant.session_id],this.emitDailyJSEvent(e)}break;case Ir:T(this._participantCounts,e.participantCounts)||(this._participantCounts=e.participantCounts,this.emitDailyJSEvent(e));break;case Lr:var c={access:e.access};e.awaitingAccess&&(c.awaitingAccess=e.awaitingAccess),T(this._accessState,c)||(this._accessState=c,this.emitDailyJSEvent(e));break;case Nr:if(e.meetingSession){this._meetingSessionSummary=e.meetingSession,this.emitDailyJSEvent(e);var u=Uo(Uo({},e),{},{action:"meeting-session-updated"});this.emitDailyJSEvent(u)}break;case Si:var l;this._iframe&&!e.preserveIframe&&(this._iframe.src=""),this._updateCallState(Vn),this.resetMeetingDependentVars(),this._loadedCallback&&(this._loadedCallback(e.errorMsg),this._loadedCallback=null),e.preserveIframe;var d=o(e,Fo);null!=d&&null!==(l=d.error)&&void 0!==l&&l.details&&(d.error.details=JSON.parse(d.error.details)),this._maybeSendToSentry(e),this._joinedCallback&&(this._joinedCallback(null,d),this._joinedCallback=null),this.emitDailyJSEvent(d);break;case Ar:this._callState!==Vn&&this._updateCallState(Un),this.resetMeetingDependentVars(),this._resolveLeave&&(this._resolveLeave(),this._resolveLeave=null),this.emitDailyJSEvent(e);break;case"selected-devices-updated":e.devices&&this.emitDailyJSEvent(e);break;case si:var f=e.threshold,h=e.quality;f===this._network.threshold&&h===this._network.quality||(this._network.quality=h,this._network.threshold=f,this.emitDailyJSEvent(e));break;case ui:e&&e.cpuLoadState&&this.emitDailyJSEvent(e);break;case li:e&&void 0!==e.faceCounts&&this.emitDailyJSEvent(e);break;case oi:var p=e.activeSpeaker;this._activeSpeaker.peerId!==p.peerId&&(this._activeSpeaker.peerId=p.peerId,this.emitDailyJSEvent({action:e.action,activeSpeaker:this._activeSpeaker}));break;case"show-local-video-changed":if(this._callObjectMode)return;var v=e.show;this._showLocalVideo=v,this.emitDailyJSEvent({action:e.action,show:v});break;case ai:var _=e.enabled;this._activeSpeakerMode!==_&&(this._activeSpeakerMode=_,this.emitDailyJSEvent({action:e.action,enabled:this._activeSpeakerMode}));break;case jr:case Fr:case Br:this._waitingParticipants=e.allWaitingParticipants,this.emitDailyJSEvent({action:e.action,participant:e.participant});break;case mi:T(this._receiveSettings,e.receiveSettings)||(this._receiveSettings=e.receiveSettings,this.emitDailyJSEvent({action:e.action,receiveSettings:e.receiveSettings}));break;case yi:if(!T(this._inputSettings,e.inputSettings)){var g=this._getInputSettings();this._inputSettings=e.inputSettings,this._preloadCache.inputSettings={},T(g,this._getInputSettings())||this.emitDailyJSEvent({action:e.action,inputSettings:this._getInputSettings()})}break;case"send-settings-updated":T(this._sendSettings,e.sendSettings)||(this._sendSettings=e.sendSettings,this._preloadCache.sendSettings=null,this.emitDailyJSEvent({action:e.action,sendSettings:e.sendSettings}));break;case"local-audio-level":this._localAudioLevel=e.audioLevel,this._preloadCache.localAudioLevelObserver=null,this.emitDailyJSEvent(e);break;case"remote-participants-audio-level":this._remoteParticipantsAudioLevel=e.participantsAudioLevel,this._preloadCache.remoteParticipantsAudioLevelObserver=null,this.emitDailyJSEvent(e);break;case Zr:var m=e.session_id;this._rmpPlayerState[m]=e.playerState,this.emitDailyJSEvent(e);break;case ti:delete this._rmpPlayerState[e.session_id],this.emitDailyJSEvent(e);break;case ei:var y=e.session_id,b=this._rmpPlayerState[y];b&&this.compareEqualForRMPUpdateEvent(b,e.remoteMediaPlayerState)||(this._rmpPlayerState[y]=e.remoteMediaPlayerState,this.emitDailyJSEvent(e));break;case"custom-button-click":case"sidebar-view-changed":this.emitDailyJSEvent(e);break;case Rr:var S=this._meetingSessionState.topology!==(e.meetingSessionState&&e.meetingSessionState.topology);this._meetingSessionState=Ma(e.meetingSessionState,this._callObjectMode),(this._callObjectMode||S)&&this.emitDailyJSEvent(e);break;case ni:this._isScreenSharing=!0,this.emitDailyJSEvent(e);break;case ri:case ii:this._isScreenSharing=!1,this.emitDailyJSEvent(e);break;case $r:case qr:case Wr:case zr:case Hr:case Yr:case Gr:case Jr:case kr:case Tr:case Qr:case Xr:case"test-completed":case ci:case Kr:case hi:case pi:case vi:case _i:case bi:case gi:case"dialin-ready":case"dialin-connected":case"dialin-error":case"dialin-stopped":case"dialin-warning":case"dialout-connected":case"dialout-answered":case"dialout-error":case"dialout-stopped":case"dialout-warning":this.emitDailyJSEvent(e);break;case"request-fullscreen":this.requestFullscreen();break;case"request-exit-fullscreen":this.exitFullscreen()}}},{key:"maybeEventRecordingStopped",value:function(e,t){var n="record";e&&(t.local||!1!==t[n]||e[n]===t[n]||this.emitDailyJSEvent({action:qr}))}},{key:"maybeEventRecordingStarted",value:function(e,t){var n="record";e&&(t.local||!0!==t[n]||e[n]===t[n]||this.emitDailyJSEvent({action:$r}))}},{key:"maybeEventTrackStopped",value:function(e,t,n,r){e&&("ended"!==e.readyState&&t&&e.id===t.id||this.emitDailyJSEvent({action:Vr,track:e,participant:n,type:r}))}},{key:"maybeEventTrackStarted",value:function(e,t,n,r){t&&(e&&"ended"!==e.readyState&&t.id===e.id||this.emitDailyJSEvent({action:Ur,track:t,participant:n,type:r}))}},{key:"maybeParticipantTracksStopped",value:function(e,t){if(e)for(var n in e.tracks)this.maybeEventTrackStopped(e.tracks[n].track,t&&t.tracks[n]?t.tracks[n].track:null,t,n)}},{key:"maybeParticipantTracksStarted",value:function(e,t){if(t)for(var n in t.tracks)this.maybeEventTrackStarted(e&&e.tracks[n]?e.tracks[n].track:null,t.tracks[n].track,t,n)}},{key:"compareEqualForRMPUpdateEvent",value:function(e,t){var n,r;return e.state===t.state&&(null===(n=e.settings)||void 0===n?void 0:n.volume)===(null===(r=t.settings)||void 0===r?void 0:r.volume)}},{key:"emitDailyJSEvent",value:function(e){try{e.callClientId=this.callClientId,this.emit(e.action,e)}catch(t){console.log("could not emit",e,t)}}},{key:"compareEqualForParticipantUpdateEvent",value:function(e,t){return!(!T(e,t)||e.videoTrack&&t.videoTrack&&(e.videoTrack.id!==t.videoTrack.id||e.videoTrack.muted!==t.videoTrack.muted||e.videoTrack.enabled!==t.videoTrack.enabled)||e.audioTrack&&t.audioTrack&&(e.audioTrack.id!==t.audioTrack.id||e.audioTrack.muted!==t.audioTrack.muted||e.audioTrack.enabled!==t.audioTrack.enabled))}},{key:"nativeUtils",value:function(){return Ri()?"undefined"==typeof DailyNativeUtils?(console.warn("in React Native, DailyNativeUtils is expected to be available"),null):DailyNativeUtils:null}},{key:"updateIsPreparingToJoin",value:function(e){this._updateCallState(this._callState,e)}},{key:"_updateCallState",value:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:this._isPreparingToJoin;if(e!==this._callState||t!==this._isPreparingToJoin){var n=this._callState,r=this._isPreparingToJoin;this._callState=e,this._isPreparingToJoin=t;var i=oa(n,r),o=oa(this._callState,this._isPreparingToJoin);i!==o&&(this.updateKeepDeviceAwake(o),this.updateDeviceAudioMode(o),this.updateShowAndroidOngoingMeetingNotification(o),this.updateNoOpRecordingEnsuringBackgroundContinuity(o))}}},{key:"resetMeetingDependentVars",value:function(){this._participants={},this._participantCounts=Wo,this._waitingParticipants={},this._activeSpeaker={},this._activeSpeakerMode=!1,this._didPreAuth=!1,this._accessState={access:zn},this._finalSummaryOfPrevSession=this._meetingSessionSummary,this._meetingSessionSummary={},this._meetingSessionState=Ma(qo,this._callObjectMode),this._isScreenSharing=!1,this._receiveSettings={},this._inputSettings=void 0,this._sendSettings={},this._localAudioLevel=0,this._isLocalAudioLevelObserverRunning=!1,this._remoteParticipantsAudioLevel={},this._isRemoteParticipantsAudioLevelObserverRunning=!1,this._maxAppMessageSize=Ei,this._callMachineInitialized=!1,this._bundleLoadTime=void 0,this._preloadCache}},{key:"updateKeepDeviceAwake",value:function(e){Ri()&&this.nativeUtils().setKeepDeviceAwake(e,this.callClientId)}},{key:"updateDeviceAudioMode",value:function(e){if(Ri()&&!this.disableReactNativeAutoDeviceManagement("audio")){var t=e?this._nativeInCallAudioMode:"idle";this.nativeUtils().setAudioMode(t)}}},{key:"updateShowAndroidOngoingMeetingNotification",value:function(e){if(Ri()&&this.nativeUtils().setShowOngoingMeetingNotification){var t,n,r,i;if(this.properties.reactNativeConfig&&this.properties.reactNativeConfig.androidInCallNotification){var o=this.properties.reactNativeConfig.androidInCallNotification;t=o.title,n=o.subtitle,r=o.iconName,i=o.disableForCustomOverride}i&&(e=!1),this.nativeUtils().setShowOngoingMeetingNotification(e,t,n,r,this.callClientId)}}},{key:"updateNoOpRecordingEnsuringBackgroundContinuity",value:function(e){Ri()&&this.nativeUtils().enableNoOpRecordingEnsuringBackgroundContinuity&&this.nativeUtils().enableNoOpRecordingEnsuringBackgroundContinuity(e)}},{key:"toggleParticipantAudioBasedOnNativeAudioFocus",value:function(){var e,t;if(Ri()){var n=null===(e=this._callMachine())||void 0===e||null===(t=e.store)||void 0===t?void 0:t.getState();for(var r in null==n?void 0:n.streams){var i=n.streams[r];i&&i.pendingTrack&&"audio"===i.pendingTrack.kind&&(i.pendingTrack.enabled=this._hasNativeAudioFocus)}}}},{key:"disableReactNativeAutoDeviceManagement",value:function(e){return this.properties.reactNativeConfig&&this.properties.reactNativeConfig.disableAutoDeviceManagement&&this.properties.reactNativeConfig.disableAutoDeviceManagement[e]}},{key:"absoluteUrl",value:function(e){if(void 0!==e){var t=document.createElement("a");return t.href=e,t.href}}},{key:"sayHello",value:function(){var e="hello, world.";return console.log(e),e}},{key:"_logUseAfterDestroy",value:function(){var e=Object.values(Go)[0];if(this.needsLoad())if(e&&!e.needsLoad()){var t={action:Ci,level:"error",code:this.strictMode?9995:9997};e.sendMessageToCallMachine(t)}else this.strictMode||console.error("You are are attempting to use a call instance that was previously destroyed, which is unsupported. Please remove `strictMode: false` from your constructor properties to enable strict mode to track down and fix this unsupported usage.");else{var n={action:Ci,level:"error",code:this.strictMode?9995:9997};this._messageChannel.sendMessageToCallMachine(n,null,this.callClientId,this._iframe)}}},{key:"_logDuplicateInstanceAttempt",value:function(){for(var e=0,t=Object.values(Go);e<t.length;e++){var n=t[e];n._callMachineInitialized?(n.sendMessageToCallMachine({action:Ci,level:"warn",code:this.allowMultipleCallInstances?9993:9992}),n._delayDuplicateInstanceLog=!1):n._delayDuplicateInstanceLog=!0}}},{key:"_maybeSendToSentry",value:function(e){var t,n,r,i,o,a;if(null===(t=e.error)||void 0===t||!t.type||["connection-error","end-of-life","no-room"].includes(e.error.type)){var s=null!==(n=this.properties)&&void 0!==n&&n.url?new URL(this.properties.url):void 0,c="production";s&&s.host.includes(".staging.daily")&&(c="staging");var u,l,d,f,h,p=new Kt({dsn:"https://f10f1c81e5d44a4098416c0867a8b740@o77906.ingest.sentry.io/168844",transport:rn,integrations:[new Nn.GlobalHandlers({onunhandledrejection:!1}),new Nn.HttpContext],environment:c}),v=new Ke(p,void 0,oe.version());if(this.session_id&&v.setExtra("sessionId",this.session_id),this.properties){var _=Uo({},this.properties);_.userName=_.userName?"[Filtered]":void 0,_.userData=_.userData?"[Filtered]":void 0,_.token=_.token?"[Filtered]":void 0,v.setExtra("properties",_)}if(s){var g=s.searchParams.get("domain");if(!g){var m=s.host.match(/(.*?)\./);g=m&&m[1]||""}g&&v.setTag("domain",g)}e.error&&(v.setTag("fatalErrorType",e.error.type),v.setExtra("errorDetails",e.error.details),(null===(u=e.error.details)||void 0===u?void 0:u.uri)&&v.setTag("serverAddress",e.error.details.uri),(null===(l=e.error.details)||void 0===l?void 0:l.workerGroup)&&v.setTag("workerGroup",e.error.details.workerGroup),(null===(d=e.error.details)||void 0===d?void 0:d.geoGroup)&&v.setTag("geoGroup",e.error.details.geoGroup),(null===(f=e.error.details)||void 0===f?void 0:f.on)&&v.setTag("connectionAttempt",e.error.details.on),null!==(h=e.error.details)&&void 0!==h&&h.bundleUrl&&(v.setTag("bundleUrl",e.error.details.bundleUrl),v.setTag("bundleError",e.error.details.sourceError.type))),v.setTags({callMode:this._callObjectMode?Ri()?"reactNative":null!==(r=this.properties)&&void 0!==r&&null!==(i=r.dailyConfig)&&void 0!==i&&null!==(o=i.callMode)&&void 0!==o&&o.includes("prebuilt")?this.properties.dailyConfig.callMode:"custom":"prebuilt-frame",version:oe.version()});var y=(null===(a=e.error)||void 0===a?void 0:a.msg)||e.errorMsg;v.run((function(e){e.captureException(new Error(y))}))}}},{key:"_callMachine",value:function(){var e,t,n;return null===(e=window._daily)||void 0===e||null===(t=e.instances)||void 0===t||null===(n=t[this.callClientId])||void 0===n?void 0:n.callMachine}}],[{key:"supportedBrowser",value:function(){if(Ri())return{supported:!0,mobile:!0,name:"React Native",version:null,supportsScreenShare:!0,supportsSfu:!0,supportsVideoProcessing:!1,supportsAudioProcessing:!1};var e=C().getParser(Ni());return{supported:!!Vi(),mobile:"mobile"===e.getPlatformType(),name:e.getBrowserName(),version:e.getBrowserVersion(),supportsFullscreen:!!ji(),supportsScreenShare:!!(navigator&&navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia&&(function(e,t){if(!e||!t)return!0;switch(e){case"Chrome":return t.major>=75;case"Safari":return RTCRtpTransceiver.prototype.hasOwnProperty("currentDirection")&&!(13===t.major&&0===t.minor&&0===t.point);case"Firefox":return t.major>=67}return!0}(Ji(),$i())||Ri())),supportsSfu:!!Vi(),supportsVideoProcessing:Bi(),supportsAudioProcessing:Ui()}}},{key:"version",value:function(){return"0.72.2"}},{key:"createCallObject",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};return e.layout="none",new oe(null,e)}},{key:"wrap",value:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{};if(da(),!e||!e.contentWindow||"string"!=typeof e.src)throw new Error("DailyIframe::Wrap needs an iframe-like first argument");return t.layout||(t.customLayout?t.layout="custom-v1":t.layout="browser"),new oe(e,t)}},{key:"createFrame",value:function(e,t){var n,r;da(),e&&t?(n=e,r=t):e&&e.append?(n=e,r={}):(n=document.body,r=e||{});var i=r.iframeStyle;i||(i=n===document.body?{position:"fixed",border:"1px solid black",backgroundColor:"white",width:"375px",height:"450px",right:"1em",bottom:"1em"}:{border:0,width:"100%",height:"100%"});var o=document.createElement("iframe");window.navigator&&window.navigator.userAgent.match(/Chrome\/61\./)?o.allow="microphone, camera":o.allow="microphone; camera; autoplay; display-capture; screen-wake-lock",o.style.visibility="hidden",n.appendChild(o),o.style.visibility=null,Object.keys(i).forEach((function(e){return o.style[e]=i[e]})),r.layout||(r.customLayout?r.layout="custom-v1":r.layout="browser");try{return new oe(o,r)}catch(e){throw n.removeChild(o),e}}},{key:"createTransparentFrame",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};da();var t=document.createElement("iframe");return t.allow="microphone; camera; autoplay",t.style.cssText="\n      position: fixed;\n      top: 0;\n      left: 0;\n      width: 100%;\n      height: 100%;\n      border: 0;\n      pointer-events: none;\n    ",document.body.appendChild(t),e.layout||(e.layout="custom-v1"),oe.wrap(t,e)}},{key:"getCallInstance",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:void 0;return e?Go[e]:Object.values(Go)[0]}}]),oe}(E());function ra(e,t){var n={};for(var r in e)if(e[r]instanceof MediaStreamTrack)n[r]=Ai;else if("dailyConfig"===r){if(e[r].modifyLocalSdpHook){var i=window._daily.instances[t].customCallbacks||{};i.modifyLocalSdpHook=e[r].modifyLocalSdpHook,window._daily.instances[t].customCallbacks=i,delete e[r].modifyLocalSdpHook}if(e[r].modifyRemoteSdpHook){var o=window._daily.instances[t].customCallbacks||{};o.modifyRemoteSdpHook=e[r].modifyRemoteSdpHook,window._daily.instances[t].customCallbacks=o,delete e[r].modifyRemoteSdpHook}n[r]=e[r]}else n[r]=e[r];return n}function ia(e){var t=arguments.length>2?arguments[2]:void 0;if(e!==Bn){var n="".concat(arguments.length>1&&void 0!==arguments[1]?arguments[1]:"This daily-js method"," only supported after join.");throw t&&(n+=" ".concat(t)),console.error(n),new Error(n)}}function oa(e,t){return[Fn,Bn].includes(e)||t}function aa(e,t){var n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:"This daily-js method",r=arguments.length>3?arguments[3]:void 0;if(oa(e,t)){var i="".concat(n," not supported after joining a meeting.");throw r&&(i+=" ".concat(r)),console.error(i),new Error(i)}}function sa(e){var t=arguments.length>2?arguments[2]:void 0;if(!e){var n="".concat(arguments.length>1&&void 0!==arguments[1]?arguments[1]:"This daily-js method",arguments.length>3&&void 0!==arguments[3]&&arguments[3]?" requires preAuth() or startCamera() to initialize call state.":" requires preAuth(), startCamera(), or join() to initialize call state.");throw t&&(n+=" ".concat(t)),console.error(n),new Error(n)}}function ca(e){if(e){var t="A pre-call quality test is in progress. Please try ".concat(arguments.length>1&&void 0!==arguments[1]?arguments[1]:"This daily-js method"," again once testing has completed. Use stopTestCallQuality() to end it early.");throw console.error(t),new Error(t)}}function ua(e){if(!e){var t="".concat(arguments.length>1&&void 0!==arguments[1]?arguments[1]:"This daily-js method"," is only supported on custom callObject instances");throw console.error(t),new Error(t)}}function la(e){if(e){var t="".concat(arguments.length>1&&void 0!==arguments[1]?arguments[1]:"This daily-js method"," is only supported as part of Daily's Prebuilt");throw console.error(t),new Error(t)}}function da(){if(Ri())throw new Error("This daily-js method is not currently supported in React Native")}function fa(){if(!Ri())throw new Error("This daily-js method is only supported in React Native")}function ha(e){if(void 0===e)return!0;var t;if("string"==typeof e)t=e;else try{t=JSON.stringify(e),T(JSON.parse(t),e)||console.warn("The userData provided will be modified when serialized.")}catch(e){throw Error("userData must be serializable to JSON: ".concat(e))}if(t.length>4096)throw Error("userData is too large (".concat(t.length," characters). Maximum size suppported is ").concat(4096,"."));return!0}function pa(e,t){for(var n=t.allowAllParticipantsKey,r=function(e){var t=["local"];return n||t.push("*"),e&&!t.includes(e)},i=function(e){return!!(void 0===e.layer||Number.isInteger(e.layer)&&e.layer>=0||"inherit"===e.layer)},o=function(e){return!(!e||e.video&&!i(e.video)||e.screenVideo&&!i(e.screenVideo))},a=0,s=Object.entries(e);a<s.length;a++){var c=b(s[a],2),u=c[0],l=c[1];if(!r(u)||!o(l))return!1}return!0}function va(e){return!("object"!==s(e)||e.video&&("object"!==s(e.video)||!function(e){var t=["type","config"];if(!e)return!1;if("object"!==s(e))return!1;if(!function(e){return"string"==typeof e&&(!!Object.values(Oi).includes(e)||(console.error("inputSettings video processor type invalid"),!1))}(e.type))return!1;if(e.config){if("object"!==s(e.config))return!1;if(!function(e,t){var n=Object.keys(t);if(0===n.length)return!0;var r="invalid object in inputSettings -> video -> processor -> config";switch(e){case Oi.BGBLUR:return n.length>1||"strength"!==n[0]?(console.error(r),!1):!("number"!=typeof t.strength||t.strength<=0||t.strength>1||isNaN(t.strength))||(console.error("".concat(r,"; expected: {0 < strength <= 1}, got: ").concat(t.strength)),!1);case Oi.BGIMAGE:return!(void 0!==t.source&&!function(e){return"default"===e.source?(e.type="default",!0):e.source instanceof ArrayBuffer||(I(e.source)?(e.type="url",!!function(e){var t=new URL(e),n=t.pathname;if("data:"===t.protocol)try{var r=n.substring(n.indexOf(":")+1,n.indexOf(";")).split("/")[1];return Ii.includes(r)}catch(e){return console.error("failed to deduce blob content type",e),!1}var i=n.split(".").at(-1).toLowerCase().trim();return Ii.includes(i)}(e.source)||(console.error("invalid image type; supported types: [".concat(Ii.join(", "),"]")),!1)):(t=e.source,n=Number(t),isNaN(n)||!Number.isInteger(n)||n<=0||n>10?(console.error("invalid image selection; must be an int, > 0, <= ".concat(10)),!1):(e.type="daily-preselect",!0)));var t,n}(t));default:return!0}}(e.type,e.config))return!1}return Object.keys(e).filter((function(e){return!t.includes(e)})).forEach((function(t){console.warn("invalid key inputSettings -> video -> processor : ".concat(t)),delete e[t]})),!0}(e.video.processor))||e.audio&&("object"!==s(e.audio)||(n=e.audio.processor,r=["type"],!n||"object"!==s(n)||(Object.keys(n).filter((function(e){return!r.includes(e)})).forEach((function(e){console.warn("invalid key inputSettings -> audio -> processor : ".concat(e)),delete n[e]})),t=n.type,"string"!=typeof t||!Object.values(Pi).includes(t)&&(console.error("inputSettings audio processor type invalid"),1)))));var t,n,r}function _a(e,t){var n,r=[];e.video&&!Bi(null!==(n=null==t?void 0:t.useLegacyVideoProcessor)&&void 0!==n&&n)&&(delete e.video,r.push("video")),e.audio&&!Ui()&&(delete e.audio,r.push("audio")),r.length>0&&console.error("Ignoring settings for browser- or platform-unsupported input processor(s): ".concat(r.join(", ")))}function ga(){var e=Object.values(Oi).join(" | "),t=Object.values(Pi).join(" | ");return"inputSettings must be of the form: { video?: { processor: { type: [ ".concat(e," ], config?: {} } }, audio?: { processor: {type: [ ").concat(t," ] } } }")}function ma(e){var t=e.allowAllParticipantsKey;return"receiveSettings must be of the form { [<remote participant id> | ".concat(Xn).concat(t?' | "'.concat(Zn,'"'):"","]: ")+'{ [video: [{ layer: [<non-negative integer> | "inherit"] } | "inherit"]], [screenVideo: [{ layer: [<non-negative integer> | "inherit"] } | "inherit"]] }}}'}function ya(){return"customIntegrations should be an object of type ".concat(JSON.stringify(Zo),".")}function ba(e){if(e&&"object"!==s(e)||Array.isArray(e))return console.error("customTrayButtons should be an Object of the type ".concat(JSON.stringify(Xo),".")),!1;if(e)for(var t=0,n=Object.entries(e);t<n.length;t++)for(var r=b(n[t],1)[0],i=0,o=Object.entries(e[r]);i<o.length;i++){var a=b(o[i],2),c=a[0],u=a[1];if("iconPath"===c&&!I(u))return console.error("customTrayButton ".concat(c," should be a url.")),!1;if("iconPathDarkMode"===c&&!I(u))return console.error("customTrayButton ".concat(c," should be a url.")),!1;var l=Xo.id[c];if(!l)return console.error("customTrayButton does not support key ".concat(c)),!1;if(s(u)!==l)return console.error("customTrayButton ".concat(c," should be a ").concat(l,".")),!1}return!0}function Sa(e){if(!e||e&&"object"!==s(e)||Array.isArray(e))return console.error(ya()),!1;for(var t=function(e){return"".concat(e," should be ").concat(Zo.id[e])},n=function(e,t){return console.error("customIntegration ".concat(e,": ").concat(t))},r=0,i=Object.entries(e);r<i.length;r++){var o=b(i[r],1)[0];if(!("label"in e[o]))return n(o,"label is required"),!1;if(!("location"in e[o]))return n(o,"location is required"),!1;if(!("src"in e[o])&&!("srcdoc"in e[o]))return n(o,"src or srcdoc is required"),!1;for(var a=0,c=Object.entries(e[o]);a<c.length;a++){var u=b(c[a],2),l=u[0],d=u[1];switch(l){case"allow":case"csp":case"name":case"referrerPolicy":case"sandbox":if("string"!=typeof d)return n(o,t(l)),!1;break;case"iconURL":if(!I(d))return n(o,"".concat(l," should be a url")),!1;break;case"src":if("srcdoc"in e[o])return n(o,"cannot have both src and srcdoc"),!1;if(!I(d))return n(o,'src "'.concat(d,'" is not a valid URL')),!1;break;case"srcdoc":if("src"in e[o])return n(o,"cannot have both src and srcdoc"),!1;if("string"!=typeof d)return n(o,t(l)),!1;break;case"location":if(!["main","sidebar"].includes(d))return n(o,t(l)),!1;break;case"controlledBy":if("*"!==d&&"owners"!==d&&(!Array.isArray(d)||d.some((function(e){return"string"!=typeof e}))))return n(o,t(l)),!1;break;case"shared":if((!Array.isArray(d)||d.some((function(e){return"string"!=typeof e})))&&"owners"!==d&&"boolean"!=typeof d)return n(o,t(l)),!1;break;default:if(!Zo.id[l])return console.error("customIntegration does not support key ".concat(l)),!1}}}return!0}function Ea(e,t){if(void 0===t)return!1;switch(s(t)){case"string":return s(e)===t;case"object":if("object"!==s(e))return!1;for(var n in e)if(!Ea(e[n],t[n]))return!1;return!0;default:return!1}}function wa(e,t){var n=e.sessionId,r=e.toEndPoint,i=e.useSipRefer;if(!n||!r)throw new Error("".concat(t,"() requires a sessionId and toEndPoint"));if("string"!=typeof n||"string"!=typeof r)throw new Error("Invalid paramater: sessionId and toEndPoint must be of type string");if(i&&!r.startsWith("sip:"))throw new Error('"toEndPoint" must be a "sip" address');if(!r.startsWith("sip:")&&!r.startsWith("+"))throw new Error("toEndPoint: ".concat(r,' must starts with either "sip:" or "+"'))}function ka(e){if("object"!==s(e))throw new Error('RemoteMediaPlayerSettings: must be "object" type');if(e.state&&!Object.values(Di).includes(e.state))throw new Error("Invalid value for RemoteMediaPlayerSettings.state, valid values are: "+JSON.stringify(Di));if(e.volume){if("number"!=typeof e.volume)throw new Error('RemoteMediaPlayerSettings.volume: must be "number" type');if(e.volume<0||e.volume>2)throw new Error("RemoteMediaPlayerSettings.volume: must be between 0.0 - 2.0")}}function Ta(e,t,n){return!("number"!=typeof e||e<t||e>n)}function Ma(e,t){return e&&!t&&delete e.data,e}},206:function(e){e.exports=function(e){var t={};function n(r){if(t[r])return t[r].exports;var i=t[r]={i:r,l:!1,exports:{}};return e[r].call(i.exports,i,i.exports,n),i.l=!0,i.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var i in e)n.d(r,i,function(t){return e[t]}.bind(null,i));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=90)}({17:function(e,t,n){"use strict";t.__esModule=!0,t.default=void 0;var r=n(18),i=function(){function e(){}return e.getFirstMatch=function(e,t){var n=t.match(e);return n&&n.length>0&&n[1]||""},e.getSecondMatch=function(e,t){var n=t.match(e);return n&&n.length>1&&n[2]||""},e.matchAndReturnConst=function(e,t,n){if(e.test(t))return n},e.getWindowsVersionName=function(e){switch(e){case"NT":return"NT";case"XP":case"NT 5.1":return"XP";case"NT 5.0":return"2000";case"NT 5.2":return"2003";case"NT 6.0":return"Vista";case"NT 6.1":return"7";case"NT 6.2":return"8";case"NT 6.3":return"8.1";case"NT 10.0":return"10";default:return}},e.getMacOSVersionName=function(e){var t=e.split(".").splice(0,2).map((function(e){return parseInt(e,10)||0}));if(t.push(0),10===t[0])switch(t[1]){case 5:return"Leopard";case 6:return"Snow Leopard";case 7:return"Lion";case 8:return"Mountain Lion";case 9:return"Mavericks";case 10:return"Yosemite";case 11:return"El Capitan";case 12:return"Sierra";case 13:return"High Sierra";case 14:return"Mojave";case 15:return"Catalina";default:return}},e.getAndroidVersionName=function(e){var t=e.split(".").splice(0,2).map((function(e){return parseInt(e,10)||0}));if(t.push(0),!(1===t[0]&&t[1]<5))return 1===t[0]&&t[1]<6?"Cupcake":1===t[0]&&t[1]>=6?"Donut":2===t[0]&&t[1]<2?"Eclair":2===t[0]&&2===t[1]?"Froyo":2===t[0]&&t[1]>2?"Gingerbread":3===t[0]?"Honeycomb":4===t[0]&&t[1]<1?"Ice Cream Sandwich":4===t[0]&&t[1]<4?"Jelly Bean":4===t[0]&&t[1]>=4?"KitKat":5===t[0]?"Lollipop":6===t[0]?"Marshmallow":7===t[0]?"Nougat":8===t[0]?"Oreo":9===t[0]?"Pie":void 0},e.getVersionPrecision=function(e){return e.split(".").length},e.compareVersions=function(t,n,r){void 0===r&&(r=!1);var i=e.getVersionPrecision(t),o=e.getVersionPrecision(n),a=Math.max(i,o),s=0,c=e.map([t,n],(function(t){var n=a-e.getVersionPrecision(t),r=t+new Array(n+1).join(".0");return e.map(r.split("."),(function(e){return new Array(20-e.length).join("0")+e})).reverse()}));for(r&&(s=a-Math.min(i,o)),a-=1;a>=s;){if(c[0][a]>c[1][a])return 1;if(c[0][a]===c[1][a]){if(a===s)return 0;a-=1}else if(c[0][a]<c[1][a])return-1}},e.map=function(e,t){var n,r=[];if(Array.prototype.map)return Array.prototype.map.call(e,t);for(n=0;n<e.length;n+=1)r.push(t(e[n]));return r},e.find=function(e,t){var n,r;if(Array.prototype.find)return Array.prototype.find.call(e,t);for(n=0,r=e.length;n<r;n+=1){var i=e[n];if(t(i,n))return i}},e.assign=function(e){for(var t,n,r=e,i=arguments.length,o=new Array(i>1?i-1:0),a=1;a<i;a++)o[a-1]=arguments[a];if(Object.assign)return Object.assign.apply(Object,[e].concat(o));var s=function(){var e=o[t];"object"==typeof e&&null!==e&&Object.keys(e).forEach((function(t){r[t]=e[t]}))};for(t=0,n=o.length;t<n;t+=1)s();return e},e.getBrowserAlias=function(e){return r.BROWSER_ALIASES_MAP[e]},e.getBrowserTypeByAlias=function(e){return r.BROWSER_MAP[e]||""},e}();t.default=i,e.exports=t.default},18:function(e,t,n){"use strict";t.__esModule=!0,t.ENGINE_MAP=t.OS_MAP=t.PLATFORMS_MAP=t.BROWSER_MAP=t.BROWSER_ALIASES_MAP=void 0,t.BROWSER_ALIASES_MAP={"Amazon Silk":"amazon_silk","Android Browser":"android",Bada:"bada",BlackBerry:"blackberry",Chrome:"chrome",Chromium:"chromium",Electron:"electron",Epiphany:"epiphany",Firefox:"firefox",Focus:"focus",Generic:"generic","Google Search":"google_search",Googlebot:"googlebot","Internet Explorer":"ie","K-Meleon":"k_meleon",Maxthon:"maxthon","Microsoft Edge":"edge","MZ Browser":"mz","NAVER Whale Browser":"naver",Opera:"opera","Opera Coast":"opera_coast",PhantomJS:"phantomjs",Puffin:"puffin",QupZilla:"qupzilla",QQ:"qq",QQLite:"qqlite",Safari:"safari",Sailfish:"sailfish","Samsung Internet for Android":"samsung_internet",SeaMonkey:"seamonkey",Sleipnir:"sleipnir",Swing:"swing",Tizen:"tizen","UC Browser":"uc",Vivaldi:"vivaldi","WebOS Browser":"webos",WeChat:"wechat","Yandex Browser":"yandex",Roku:"roku"},t.BROWSER_MAP={amazon_silk:"Amazon Silk",android:"Android Browser",bada:"Bada",blackberry:"BlackBerry",chrome:"Chrome",chromium:"Chromium",electron:"Electron",epiphany:"Epiphany",firefox:"Firefox",focus:"Focus",generic:"Generic",googlebot:"Googlebot",google_search:"Google Search",ie:"Internet Explorer",k_meleon:"K-Meleon",maxthon:"Maxthon",edge:"Microsoft Edge",mz:"MZ Browser",naver:"NAVER Whale Browser",opera:"Opera",opera_coast:"Opera Coast",phantomjs:"PhantomJS",puffin:"Puffin",qupzilla:"QupZilla",qq:"QQ Browser",qqlite:"QQ Browser Lite",safari:"Safari",sailfish:"Sailfish",samsung_internet:"Samsung Internet for Android",seamonkey:"SeaMonkey",sleipnir:"Sleipnir",swing:"Swing",tizen:"Tizen",uc:"UC Browser",vivaldi:"Vivaldi",webos:"WebOS Browser",wechat:"WeChat",yandex:"Yandex Browser"},t.PLATFORMS_MAP={tablet:"tablet",mobile:"mobile",desktop:"desktop",tv:"tv"},t.OS_MAP={WindowsPhone:"Windows Phone",Windows:"Windows",MacOS:"macOS",iOS:"iOS",Android:"Android",WebOS:"WebOS",BlackBerry:"BlackBerry",Bada:"Bada",Tizen:"Tizen",Linux:"Linux",ChromeOS:"Chrome OS",PlayStation4:"PlayStation 4",Roku:"Roku"},t.ENGINE_MAP={EdgeHTML:"EdgeHTML",Blink:"Blink",Trident:"Trident",Presto:"Presto",Gecko:"Gecko",WebKit:"WebKit"}},90:function(e,t,n){"use strict";t.__esModule=!0,t.default=void 0;var r,i=(r=n(91))&&r.__esModule?r:{default:r},o=n(18);function a(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}var s=function(){function e(){}var t,n;return e.getParser=function(e,t){if(void 0===t&&(t=!1),"string"!=typeof e)throw new Error("UserAgent should be a string");return new i.default(e,t)},e.parse=function(e){return new i.default(e).getResult()},t=e,n=[{key:"BROWSER_MAP",get:function(){return o.BROWSER_MAP}},{key:"ENGINE_MAP",get:function(){return o.ENGINE_MAP}},{key:"OS_MAP",get:function(){return o.OS_MAP}},{key:"PLATFORMS_MAP",get:function(){return o.PLATFORMS_MAP}}],null&&a(t.prototype,null),n&&a(t,n),e}();t.default=s,e.exports=t.default},91:function(e,t,n){"use strict";t.__esModule=!0,t.default=void 0;var r=c(n(92)),i=c(n(93)),o=c(n(94)),a=c(n(95)),s=c(n(17));function c(e){return e&&e.__esModule?e:{default:e}}var u=function(){function e(e,t){if(void 0===t&&(t=!1),null==e||""===e)throw new Error("UserAgent parameter can't be empty");this._ua=e,this.parsedResult={},!0!==t&&this.parse()}var t=e.prototype;return t.getUA=function(){return this._ua},t.test=function(e){return e.test(this._ua)},t.parseBrowser=function(){var e=this;this.parsedResult.browser={};var t=s.default.find(r.default,(function(t){if("function"==typeof t.test)return t.test(e);if(t.test instanceof Array)return t.test.some((function(t){return e.test(t)}));throw new Error("Browser's test function is not valid")}));return t&&(this.parsedResult.browser=t.describe(this.getUA())),this.parsedResult.browser},t.getBrowser=function(){return this.parsedResult.browser?this.parsedResult.browser:this.parseBrowser()},t.getBrowserName=function(e){return e?String(this.getBrowser().name).toLowerCase()||"":this.getBrowser().name||""},t.getBrowserVersion=function(){return this.getBrowser().version},t.getOS=function(){return this.parsedResult.os?this.parsedResult.os:this.parseOS()},t.parseOS=function(){var e=this;this.parsedResult.os={};var t=s.default.find(i.default,(function(t){if("function"==typeof t.test)return t.test(e);if(t.test instanceof Array)return t.test.some((function(t){return e.test(t)}));throw new Error("Browser's test function is not valid")}));return t&&(this.parsedResult.os=t.describe(this.getUA())),this.parsedResult.os},t.getOSName=function(e){var t=this.getOS().name;return e?String(t).toLowerCase()||"":t||""},t.getOSVersion=function(){return this.getOS().version},t.getPlatform=function(){return this.parsedResult.platform?this.parsedResult.platform:this.parsePlatform()},t.getPlatformType=function(e){void 0===e&&(e=!1);var t=this.getPlatform().type;return e?String(t).toLowerCase()||"":t||""},t.parsePlatform=function(){var e=this;this.parsedResult.platform={};var t=s.default.find(o.default,(function(t){if("function"==typeof t.test)return t.test(e);if(t.test instanceof Array)return t.test.some((function(t){return e.test(t)}));throw new Error("Browser's test function is not valid")}));return t&&(this.parsedResult.platform=t.describe(this.getUA())),this.parsedResult.platform},t.getEngine=function(){return this.parsedResult.engine?this.parsedResult.engine:this.parseEngine()},t.getEngineName=function(e){return e?String(this.getEngine().name).toLowerCase()||"":this.getEngine().name||""},t.parseEngine=function(){var e=this;this.parsedResult.engine={};var t=s.default.find(a.default,(function(t){if("function"==typeof t.test)return t.test(e);if(t.test instanceof Array)return t.test.some((function(t){return e.test(t)}));throw new Error("Browser's test function is not valid")}));return t&&(this.parsedResult.engine=t.describe(this.getUA())),this.parsedResult.engine},t.parse=function(){return this.parseBrowser(),this.parseOS(),this.parsePlatform(),this.parseEngine(),this},t.getResult=function(){return s.default.assign({},this.parsedResult)},t.satisfies=function(e){var t=this,n={},r=0,i={},o=0;if(Object.keys(e).forEach((function(t){var a=e[t];"string"==typeof a?(i[t]=a,o+=1):"object"==typeof a&&(n[t]=a,r+=1)})),r>0){var a=Object.keys(n),c=s.default.find(a,(function(e){return t.isOS(e)}));if(c){var u=this.satisfies(n[c]);if(void 0!==u)return u}var l=s.default.find(a,(function(e){return t.isPlatform(e)}));if(l){var d=this.satisfies(n[l]);if(void 0!==d)return d}}if(o>0){var f=Object.keys(i),h=s.default.find(f,(function(e){return t.isBrowser(e,!0)}));if(void 0!==h)return this.compareVersion(i[h])}},t.isBrowser=function(e,t){void 0===t&&(t=!1);var n=this.getBrowserName().toLowerCase(),r=e.toLowerCase(),i=s.default.getBrowserTypeByAlias(r);return t&&i&&(r=i.toLowerCase()),r===n},t.compareVersion=function(e){var t=[0],n=e,r=!1,i=this.getBrowserVersion();if("string"==typeof i)return">"===e[0]||"<"===e[0]?(n=e.substr(1),"="===e[1]?(r=!0,n=e.substr(2)):t=[],">"===e[0]?t.push(1):t.push(-1)):"="===e[0]?n=e.substr(1):"~"===e[0]&&(r=!0,n=e.substr(1)),t.indexOf(s.default.compareVersions(i,n,r))>-1},t.isOS=function(e){return this.getOSName(!0)===String(e).toLowerCase()},t.isPlatform=function(e){return this.getPlatformType(!0)===String(e).toLowerCase()},t.isEngine=function(e){return this.getEngineName(!0)===String(e).toLowerCase()},t.is=function(e,t){return void 0===t&&(t=!1),this.isBrowser(e,t)||this.isOS(e)||this.isPlatform(e)},t.some=function(e){var t=this;return void 0===e&&(e=[]),e.some((function(e){return t.is(e)}))},e}();t.default=u,e.exports=t.default},92:function(e,t,n){"use strict";t.__esModule=!0,t.default=void 0;var r,i=(r=n(17))&&r.__esModule?r:{default:r},o=/version\/(\d+(\.?_?\d+)+)/i,a=[{test:[/googlebot/i],describe:function(e){var t={name:"Googlebot"},n=i.default.getFirstMatch(/googlebot\/(\d+(\.\d+))/i,e)||i.default.getFirstMatch(o,e);return n&&(t.version=n),t}},{test:[/opera/i],describe:function(e){var t={name:"Opera"},n=i.default.getFirstMatch(o,e)||i.default.getFirstMatch(/(?:opera)[\s/](\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/opr\/|opios/i],describe:function(e){var t={name:"Opera"},n=i.default.getFirstMatch(/(?:opr|opios)[\s/](\S+)/i,e)||i.default.getFirstMatch(o,e);return n&&(t.version=n),t}},{test:[/SamsungBrowser/i],describe:function(e){var t={name:"Samsung Internet for Android"},n=i.default.getFirstMatch(o,e)||i.default.getFirstMatch(/(?:SamsungBrowser)[\s/](\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/Whale/i],describe:function(e){var t={name:"NAVER Whale Browser"},n=i.default.getFirstMatch(o,e)||i.default.getFirstMatch(/(?:whale)[\s/](\d+(?:\.\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/MZBrowser/i],describe:function(e){var t={name:"MZ Browser"},n=i.default.getFirstMatch(/(?:MZBrowser)[\s/](\d+(?:\.\d+)+)/i,e)||i.default.getFirstMatch(o,e);return n&&(t.version=n),t}},{test:[/focus/i],describe:function(e){var t={name:"Focus"},n=i.default.getFirstMatch(/(?:focus)[\s/](\d+(?:\.\d+)+)/i,e)||i.default.getFirstMatch(o,e);return n&&(t.version=n),t}},{test:[/swing/i],describe:function(e){var t={name:"Swing"},n=i.default.getFirstMatch(/(?:swing)[\s/](\d+(?:\.\d+)+)/i,e)||i.default.getFirstMatch(o,e);return n&&(t.version=n),t}},{test:[/coast/i],describe:function(e){var t={name:"Opera Coast"},n=i.default.getFirstMatch(o,e)||i.default.getFirstMatch(/(?:coast)[\s/](\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/opt\/\d+(?:.?_?\d+)+/i],describe:function(e){var t={name:"Opera Touch"},n=i.default.getFirstMatch(/(?:opt)[\s/](\d+(\.?_?\d+)+)/i,e)||i.default.getFirstMatch(o,e);return n&&(t.version=n),t}},{test:[/yabrowser/i],describe:function(e){var t={name:"Yandex Browser"},n=i.default.getFirstMatch(/(?:yabrowser)[\s/](\d+(\.?_?\d+)+)/i,e)||i.default.getFirstMatch(o,e);return n&&(t.version=n),t}},{test:[/ucbrowser/i],describe:function(e){var t={name:"UC Browser"},n=i.default.getFirstMatch(o,e)||i.default.getFirstMatch(/(?:ucbrowser)[\s/](\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/Maxthon|mxios/i],describe:function(e){var t={name:"Maxthon"},n=i.default.getFirstMatch(o,e)||i.default.getFirstMatch(/(?:Maxthon|mxios)[\s/](\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/epiphany/i],describe:function(e){var t={name:"Epiphany"},n=i.default.getFirstMatch(o,e)||i.default.getFirstMatch(/(?:epiphany)[\s/](\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/puffin/i],describe:function(e){var t={name:"Puffin"},n=i.default.getFirstMatch(o,e)||i.default.getFirstMatch(/(?:puffin)[\s/](\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/sleipnir/i],describe:function(e){var t={name:"Sleipnir"},n=i.default.getFirstMatch(o,e)||i.default.getFirstMatch(/(?:sleipnir)[\s/](\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/k-meleon/i],describe:function(e){var t={name:"K-Meleon"},n=i.default.getFirstMatch(o,e)||i.default.getFirstMatch(/(?:k-meleon)[\s/](\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/micromessenger/i],describe:function(e){var t={name:"WeChat"},n=i.default.getFirstMatch(/(?:micromessenger)[\s/](\d+(\.?_?\d+)+)/i,e)||i.default.getFirstMatch(o,e);return n&&(t.version=n),t}},{test:[/qqbrowser/i],describe:function(e){var t={name:/qqbrowserlite/i.test(e)?"QQ Browser Lite":"QQ Browser"},n=i.default.getFirstMatch(/(?:qqbrowserlite|qqbrowser)[/](\d+(\.?_?\d+)+)/i,e)||i.default.getFirstMatch(o,e);return n&&(t.version=n),t}},{test:[/msie|trident/i],describe:function(e){var t={name:"Internet Explorer"},n=i.default.getFirstMatch(/(?:msie |rv:)(\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/\sedg\//i],describe:function(e){var t={name:"Microsoft Edge"},n=i.default.getFirstMatch(/\sedg\/(\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/edg([ea]|ios)/i],describe:function(e){var t={name:"Microsoft Edge"},n=i.default.getSecondMatch(/edg([ea]|ios)\/(\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/vivaldi/i],describe:function(e){var t={name:"Vivaldi"},n=i.default.getFirstMatch(/vivaldi\/(\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/seamonkey/i],describe:function(e){var t={name:"SeaMonkey"},n=i.default.getFirstMatch(/seamonkey\/(\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/sailfish/i],describe:function(e){var t={name:"Sailfish"},n=i.default.getFirstMatch(/sailfish\s?browser\/(\d+(\.\d+)?)/i,e);return n&&(t.version=n),t}},{test:[/silk/i],describe:function(e){var t={name:"Amazon Silk"},n=i.default.getFirstMatch(/silk\/(\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/phantom/i],describe:function(e){var t={name:"PhantomJS"},n=i.default.getFirstMatch(/phantomjs\/(\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/slimerjs/i],describe:function(e){var t={name:"SlimerJS"},n=i.default.getFirstMatch(/slimerjs\/(\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/blackberry|\bbb\d+/i,/rim\stablet/i],describe:function(e){var t={name:"BlackBerry"},n=i.default.getFirstMatch(o,e)||i.default.getFirstMatch(/blackberry[\d]+\/(\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/(web|hpw)[o0]s/i],describe:function(e){var t={name:"WebOS Browser"},n=i.default.getFirstMatch(o,e)||i.default.getFirstMatch(/w(?:eb)?[o0]sbrowser\/(\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/bada/i],describe:function(e){var t={name:"Bada"},n=i.default.getFirstMatch(/dolfin\/(\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/tizen/i],describe:function(e){var t={name:"Tizen"},n=i.default.getFirstMatch(/(?:tizen\s?)?browser\/(\d+(\.?_?\d+)+)/i,e)||i.default.getFirstMatch(o,e);return n&&(t.version=n),t}},{test:[/qupzilla/i],describe:function(e){var t={name:"QupZilla"},n=i.default.getFirstMatch(/(?:qupzilla)[\s/](\d+(\.?_?\d+)+)/i,e)||i.default.getFirstMatch(o,e);return n&&(t.version=n),t}},{test:[/firefox|iceweasel|fxios/i],describe:function(e){var t={name:"Firefox"},n=i.default.getFirstMatch(/(?:firefox|iceweasel|fxios)[\s/](\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/electron/i],describe:function(e){var t={name:"Electron"},n=i.default.getFirstMatch(/(?:electron)\/(\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/MiuiBrowser/i],describe:function(e){var t={name:"Miui"},n=i.default.getFirstMatch(/(?:MiuiBrowser)[\s/](\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/chromium/i],describe:function(e){var t={name:"Chromium"},n=i.default.getFirstMatch(/(?:chromium)[\s/](\d+(\.?_?\d+)+)/i,e)||i.default.getFirstMatch(o,e);return n&&(t.version=n),t}},{test:[/chrome|crios|crmo/i],describe:function(e){var t={name:"Chrome"},n=i.default.getFirstMatch(/(?:chrome|crios|crmo)\/(\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/GSA/i],describe:function(e){var t={name:"Google Search"},n=i.default.getFirstMatch(/(?:GSA)\/(\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:function(e){var t=!e.test(/like android/i),n=e.test(/android/i);return t&&n},describe:function(e){var t={name:"Android Browser"},n=i.default.getFirstMatch(o,e);return n&&(t.version=n),t}},{test:[/playstation 4/i],describe:function(e){var t={name:"PlayStation 4"},n=i.default.getFirstMatch(o,e);return n&&(t.version=n),t}},{test:[/safari|applewebkit/i],describe:function(e){var t={name:"Safari"},n=i.default.getFirstMatch(o,e);return n&&(t.version=n),t}},{test:[/.*/i],describe:function(e){var t=-1!==e.search("\\(")?/^(.*)\/(.*)[ \t]\((.*)/:/^(.*)\/(.*) /;return{name:i.default.getFirstMatch(t,e),version:i.default.getSecondMatch(t,e)}}}];t.default=a,e.exports=t.default},93:function(e,t,n){"use strict";t.__esModule=!0,t.default=void 0;var r,i=(r=n(17))&&r.__esModule?r:{default:r},o=n(18),a=[{test:[/Roku\/DVP/],describe:function(e){var t=i.default.getFirstMatch(/Roku\/DVP-(\d+\.\d+)/i,e);return{name:o.OS_MAP.Roku,version:t}}},{test:[/windows phone/i],describe:function(e){var t=i.default.getFirstMatch(/windows phone (?:os)?\s?(\d+(\.\d+)*)/i,e);return{name:o.OS_MAP.WindowsPhone,version:t}}},{test:[/windows /i],describe:function(e){var t=i.default.getFirstMatch(/Windows ((NT|XP)( \d\d?.\d)?)/i,e),n=i.default.getWindowsVersionName(t);return{name:o.OS_MAP.Windows,version:t,versionName:n}}},{test:[/Macintosh(.*?) FxiOS(.*?)\//],describe:function(e){var t={name:o.OS_MAP.iOS},n=i.default.getSecondMatch(/(Version\/)(\d[\d.]+)/,e);return n&&(t.version=n),t}},{test:[/macintosh/i],describe:function(e){var t=i.default.getFirstMatch(/mac os x (\d+(\.?_?\d+)+)/i,e).replace(/[_\s]/g,"."),n=i.default.getMacOSVersionName(t),r={name:o.OS_MAP.MacOS,version:t};return n&&(r.versionName=n),r}},{test:[/(ipod|iphone|ipad)/i],describe:function(e){var t=i.default.getFirstMatch(/os (\d+([_\s]\d+)*) like mac os x/i,e).replace(/[_\s]/g,".");return{name:o.OS_MAP.iOS,version:t}}},{test:function(e){var t=!e.test(/like android/i),n=e.test(/android/i);return t&&n},describe:function(e){var t=i.default.getFirstMatch(/android[\s/-](\d+(\.\d+)*)/i,e),n=i.default.getAndroidVersionName(t),r={name:o.OS_MAP.Android,version:t};return n&&(r.versionName=n),r}},{test:[/(web|hpw)[o0]s/i],describe:function(e){var t=i.default.getFirstMatch(/(?:web|hpw)[o0]s\/(\d+(\.\d+)*)/i,e),n={name:o.OS_MAP.WebOS};return t&&t.length&&(n.version=t),n}},{test:[/blackberry|\bbb\d+/i,/rim\stablet/i],describe:function(e){var t=i.default.getFirstMatch(/rim\stablet\sos\s(\d+(\.\d+)*)/i,e)||i.default.getFirstMatch(/blackberry\d+\/(\d+([_\s]\d+)*)/i,e)||i.default.getFirstMatch(/\bbb(\d+)/i,e);return{name:o.OS_MAP.BlackBerry,version:t}}},{test:[/bada/i],describe:function(e){var t=i.default.getFirstMatch(/bada\/(\d+(\.\d+)*)/i,e);return{name:o.OS_MAP.Bada,version:t}}},{test:[/tizen/i],describe:function(e){var t=i.default.getFirstMatch(/tizen[/\s](\d+(\.\d+)*)/i,e);return{name:o.OS_MAP.Tizen,version:t}}},{test:[/linux/i],describe:function(){return{name:o.OS_MAP.Linux}}},{test:[/CrOS/],describe:function(){return{name:o.OS_MAP.ChromeOS}}},{test:[/PlayStation 4/],describe:function(e){var t=i.default.getFirstMatch(/PlayStation 4[/\s](\d+(\.\d+)*)/i,e);return{name:o.OS_MAP.PlayStation4,version:t}}}];t.default=a,e.exports=t.default},94:function(e,t,n){"use strict";t.__esModule=!0,t.default=void 0;var r,i=(r=n(17))&&r.__esModule?r:{default:r},o=n(18),a=[{test:[/googlebot/i],describe:function(){return{type:"bot",vendor:"Google"}}},{test:[/huawei/i],describe:function(e){var t=i.default.getFirstMatch(/(can-l01)/i,e)&&"Nova",n={type:o.PLATFORMS_MAP.mobile,vendor:"Huawei"};return t&&(n.model=t),n}},{test:[/nexus\s*(?:7|8|9|10).*/i],describe:function(){return{type:o.PLATFORMS_MAP.tablet,vendor:"Nexus"}}},{test:[/ipad/i],describe:function(){return{type:o.PLATFORMS_MAP.tablet,vendor:"Apple",model:"iPad"}}},{test:[/Macintosh(.*?) FxiOS(.*?)\//],describe:function(){return{type:o.PLATFORMS_MAP.tablet,vendor:"Apple",model:"iPad"}}},{test:[/kftt build/i],describe:function(){return{type:o.PLATFORMS_MAP.tablet,vendor:"Amazon",model:"Kindle Fire HD 7"}}},{test:[/silk/i],describe:function(){return{type:o.PLATFORMS_MAP.tablet,vendor:"Amazon"}}},{test:[/tablet(?! pc)/i],describe:function(){return{type:o.PLATFORMS_MAP.tablet}}},{test:function(e){var t=e.test(/ipod|iphone/i),n=e.test(/like (ipod|iphone)/i);return t&&!n},describe:function(e){var t=i.default.getFirstMatch(/(ipod|iphone)/i,e);return{type:o.PLATFORMS_MAP.mobile,vendor:"Apple",model:t}}},{test:[/nexus\s*[0-6].*/i,/galaxy nexus/i],describe:function(){return{type:o.PLATFORMS_MAP.mobile,vendor:"Nexus"}}},{test:[/[^-]mobi/i],describe:function(){return{type:o.PLATFORMS_MAP.mobile}}},{test:function(e){return"blackberry"===e.getBrowserName(!0)},describe:function(){return{type:o.PLATFORMS_MAP.mobile,vendor:"BlackBerry"}}},{test:function(e){return"bada"===e.getBrowserName(!0)},describe:function(){return{type:o.PLATFORMS_MAP.mobile}}},{test:function(e){return"windows phone"===e.getBrowserName()},describe:function(){return{type:o.PLATFORMS_MAP.mobile,vendor:"Microsoft"}}},{test:function(e){var t=Number(String(e.getOSVersion()).split(".")[0]);return"android"===e.getOSName(!0)&&t>=3},describe:function(){return{type:o.PLATFORMS_MAP.tablet}}},{test:function(e){return"android"===e.getOSName(!0)},describe:function(){return{type:o.PLATFORMS_MAP.mobile}}},{test:function(e){return"macos"===e.getOSName(!0)},describe:function(){return{type:o.PLATFORMS_MAP.desktop,vendor:"Apple"}}},{test:function(e){return"windows"===e.getOSName(!0)},describe:function(){return{type:o.PLATFORMS_MAP.desktop}}},{test:function(e){return"linux"===e.getOSName(!0)},describe:function(){return{type:o.PLATFORMS_MAP.desktop}}},{test:function(e){return"playstation 4"===e.getOSName(!0)},describe:function(){return{type:o.PLATFORMS_MAP.tv}}},{test:function(e){return"roku"===e.getOSName(!0)},describe:function(){return{type:o.PLATFORMS_MAP.tv}}}];t.default=a,e.exports=t.default},95:function(e,t,n){"use strict";t.__esModule=!0,t.default=void 0;var r,i=(r=n(17))&&r.__esModule?r:{default:r},o=n(18),a=[{test:function(e){return"microsoft edge"===e.getBrowserName(!0)},describe:function(e){if(/\sedg\//i.test(e))return{name:o.ENGINE_MAP.Blink};var t=i.default.getFirstMatch(/edge\/(\d+(\.?_?\d+)+)/i,e);return{name:o.ENGINE_MAP.EdgeHTML,version:t}}},{test:[/trident/i],describe:function(e){var t={name:o.ENGINE_MAP.Trident},n=i.default.getFirstMatch(/trident\/(\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:function(e){return e.test(/presto/i)},describe:function(e){var t={name:o.ENGINE_MAP.Presto},n=i.default.getFirstMatch(/presto\/(\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:function(e){var t=e.test(/gecko/i),n=e.test(/like gecko/i);return t&&!n},describe:function(e){var t={name:o.ENGINE_MAP.Gecko},n=i.default.getFirstMatch(/gecko\/(\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}},{test:[/(apple)?webkit\/537\.36/i],describe:function(){return{name:o.ENGINE_MAP.Blink}}},{test:[/(apple)?webkit/i],describe:function(e){var t={name:o.ENGINE_MAP.WebKit},n=i.default.getFirstMatch(/webkit\/(\d+(\.?_?\d+)+)/i,e);return n&&(t.version=n),t}}];t.default=a,e.exports=t.default}})},187:function(e){"use strict";var t,n="object"==typeof Reflect?Reflect:null,r=n&&"function"==typeof n.apply?n.apply:function(e,t,n){return Function.prototype.apply.call(e,t,n)};t=n&&"function"==typeof n.ownKeys?n.ownKeys:Object.getOwnPropertySymbols?function(e){return Object.getOwnPropertyNames(e).concat(Object.getOwnPropertySymbols(e))}:function(e){return Object.getOwnPropertyNames(e)};var i=Number.isNaN||function(e){return e!=e};function o(){o.init.call(this)}e.exports=o,e.exports.once=function(e,t){return new Promise((function(n,r){function i(n){e.removeListener(t,o),r(n)}function o(){"function"==typeof e.removeListener&&e.removeListener("error",i),n([].slice.call(arguments))}v(e,t,o,{once:!0}),"error"!==t&&function(e,t,n){"function"==typeof e.on&&v(e,"error",t,{once:!0})}(e,i)}))},o.EventEmitter=o,o.prototype._events=void 0,o.prototype._eventsCount=0,o.prototype._maxListeners=void 0;var a=10;function s(e){if("function"!=typeof e)throw new TypeError('The "listener" argument must be of type Function. Received type '+typeof e)}function c(e){return void 0===e._maxListeners?o.defaultMaxListeners:e._maxListeners}function u(e,t,n,r){var i,o,a,u;if(s(n),void 0===(o=e._events)?(o=e._events=Object.create(null),e._eventsCount=0):(void 0!==o.newListener&&(e.emit("newListener",t,n.listener?n.listener:n),o=e._events),a=o[t]),void 0===a)a=o[t]=n,++e._eventsCount;else if("function"==typeof a?a=o[t]=r?[n,a]:[a,n]:r?a.unshift(n):a.push(n),(i=c(e))>0&&a.length>i&&!a.warned){a.warned=!0;var l=new Error("Possible EventEmitter memory leak detected. "+a.length+" "+String(t)+" listeners added. Use emitter.setMaxListeners() to increase limit");l.name="MaxListenersExceededWarning",l.emitter=e,l.type=t,l.count=a.length,u=l,console&&console.warn&&console.warn(u)}return e}function l(){if(!this.fired)return this.target.removeListener(this.type,this.wrapFn),this.fired=!0,0===arguments.length?this.listener.call(this.target):this.listener.apply(this.target,arguments)}function d(e,t,n){var r={fired:!1,wrapFn:void 0,target:e,type:t,listener:n},i=l.bind(r);return i.listener=n,r.wrapFn=i,i}function f(e,t,n){var r=e._events;if(void 0===r)return[];var i=r[t];return void 0===i?[]:"function"==typeof i?n?[i.listener||i]:[i]:n?function(e){for(var t=new Array(e.length),n=0;n<t.length;++n)t[n]=e[n].listener||e[n];return t}(i):p(i,i.length)}function h(e){var t=this._events;if(void 0!==t){var n=t[e];if("function"==typeof n)return 1;if(void 0!==n)return n.length}return 0}function p(e,t){for(var n=new Array(t),r=0;r<t;++r)n[r]=e[r];return n}function v(e,t,n,r){if("function"==typeof e.on)r.once?e.once(t,n):e.on(t,n);else{if("function"!=typeof e.addEventListener)throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type '+typeof e);e.addEventListener(t,(function i(o){r.once&&e.removeEventListener(t,i),n(o)}))}}Object.defineProperty(o,"defaultMaxListeners",{enumerable:!0,get:function(){return a},set:function(e){if("number"!=typeof e||e<0||i(e))throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received '+e+".");a=e}}),o.init=function(){void 0!==this._events&&this._events!==Object.getPrototypeOf(this)._events||(this._events=Object.create(null),this._eventsCount=0),this._maxListeners=this._maxListeners||void 0},o.prototype.setMaxListeners=function(e){if("number"!=typeof e||e<0||i(e))throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received '+e+".");return this._maxListeners=e,this},o.prototype.getMaxListeners=function(){return c(this)},o.prototype.emit=function(e){for(var t=[],n=1;n<arguments.length;n++)t.push(arguments[n]);var i="error"===e,o=this._events;if(void 0!==o)i=i&&void 0===o.error;else if(!i)return!1;if(i){var a;if(t.length>0&&(a=t[0]),a instanceof Error)throw a;var s=new Error("Unhandled error."+(a?" ("+a.message+")":""));throw s.context=a,s}var c=o[e];if(void 0===c)return!1;if("function"==typeof c)r(c,this,t);else{var u=c.length,l=p(c,u);for(n=0;n<u;++n)r(l[n],this,t)}return!0},o.prototype.addListener=function(e,t){return u(this,e,t,!1)},o.prototype.on=o.prototype.addListener,o.prototype.prependListener=function(e,t){return u(this,e,t,!0)},o.prototype.once=function(e,t){return s(t),this.on(e,d(this,e,t)),this},o.prototype.prependOnceListener=function(e,t){return s(t),this.prependListener(e,d(this,e,t)),this},o.prototype.removeListener=function(e,t){var n,r,i,o,a;if(s(t),void 0===(r=this._events))return this;if(void 0===(n=r[e]))return this;if(n===t||n.listener===t)0==--this._eventsCount?this._events=Object.create(null):(delete r[e],r.removeListener&&this.emit("removeListener",e,n.listener||t));else if("function"!=typeof n){for(i=-1,o=n.length-1;o>=0;o--)if(n[o]===t||n[o].listener===t){a=n[o].listener,i=o;break}if(i<0)return this;0===i?n.shift():function(e,t){for(;t+1<e.length;t++)e[t]=e[t+1];e.pop()}(n,i),1===n.length&&(r[e]=n[0]),void 0!==r.removeListener&&this.emit("removeListener",e,a||t)}return this},o.prototype.off=o.prototype.removeListener,o.prototype.removeAllListeners=function(e){var t,n,r;if(void 0===(n=this._events))return this;if(void 0===n.removeListener)return 0===arguments.length?(this._events=Object.create(null),this._eventsCount=0):void 0!==n[e]&&(0==--this._eventsCount?this._events=Object.create(null):delete n[e]),this;if(0===arguments.length){var i,o=Object.keys(n);for(r=0;r<o.length;++r)"removeListener"!==(i=o[r])&&this.removeAllListeners(i);return this.removeAllListeners("removeListener"),this._events=Object.create(null),this._eventsCount=0,this}if("function"==typeof(t=n[e]))this.removeListener(e,t);else if(void 0!==t)for(r=t.length-1;r>=0;r--)this.removeListener(e,t[r]);return this},o.prototype.listeners=function(e){return f(this,e,!0)},o.prototype.rawListeners=function(e){return f(this,e,!1)},o.listenerCount=function(e,t){return"function"==typeof e.listenerCount?e.listenerCount(t):h.call(e,t)},o.prototype.listenerCount=h,o.prototype.eventNames=function(){return this._eventsCount>0?t(this._events):[]}}},t={};function n(r){var i=t[r];if(void 0!==i)return i.exports;var o=t[r]={id:r,loaded:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.loaded=!0,o.exports}return n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,{a:t}),t},n.d=function(e,t){for(var r in t)n.o(t,r)&&!n.o(e,r)&&Object.defineProperty(e,r,{enumerable:!0,get:t[r]})},n.hmd=function(e){return(e=Object.create(e)).children||(e.children=[]),Object.defineProperty(e,"exports",{enumerable:!0,set:function(){throw new Error("ES Modules may not assign module.exports or exports.*, Use ESM export syntax, instead: "+e.id)}}),e},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n(880)}()})),globalThis&&globalThis.Daily&&(globalThis.DailyIframe=globalThis.Daily);
}).call(this)}).call(this,require('_process'))
},{"_process":5}],8:[function(require,module,exports){
var $8zHUo$dailycodailyjs = require("@daily-co/daily-js");
var $8zHUo$realtimeai = require("realtime-ai");


function $parcel$exportWildcard(dest, source) {
  Object.keys(source).forEach(function(key) {
    if (key === 'default' || key === '__esModule' || Object.prototype.hasOwnProperty.call(dest, key)) {
      return;
    }

    Object.defineProperty(dest, key, {
      enumerable: true,
      get: function get() {
        return source[key];
      }
    });
  });

  return dest;
}

function $parcel$interopDefault(a) {
  return a && a.__esModule ? a.default : a;
}

function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}
var $bbd4e85ccc0fdffc$exports = {};

$parcel$export($bbd4e85ccc0fdffc$exports, "DailyTransport", () => $bbd4e85ccc0fdffc$export$b1ca982aa1e488c1);


class $bbd4e85ccc0fdffc$export$b1ca982aa1e488c1 extends (0, $8zHUo$realtimeai.Transport) {
    constructor(){
        super();
        this._botId = "";
        this._selectedCam = {};
        this._selectedMic = {};
    }
    initialize(options, messageHandler) {
        this._callbacks = options.callbacks ?? {};
        this._onMessage = messageHandler;
        const existingInstance = (0, ($parcel$interopDefault($8zHUo$dailycodailyjs))).getCallInstance();
        if (existingInstance) existingInstance.destroy();
        this._daily = (0, ($parcel$interopDefault($8zHUo$dailycodailyjs))).createCallObject({
            startVideoOff: !(options.enableCam == true),
            startAudioOff: options.enableMic == false,
            allowMultipleCallInstances: true,
            dailyConfig: {}
        });
        this.attachEventListeners();
        this.state = "disconnected";
        console.debug("[RTVI Transport] Initialized");
    }
    get state() {
        return this._state;
    }
    set state(state) {
        if (this._state === state) return;
        this._state = state;
        this._callbacks.onTransportStateChanged?.(state);
    }
    async getAllCams() {
        const { devices: devices } = await this._daily.enumerateDevices();
        return devices.filter((d)=>d.kind === "videoinput");
    }
    updateCam(camId) {
        this._daily.setInputDevicesAsync({
            videoDeviceId: camId
        }).then((infos)=>{
            this._selectedCam = infos.camera;
        });
    }
    get selectedCam() {
        return this._selectedCam;
    }
    async getAllMics() {
        const { devices: devices } = await this._daily.enumerateDevices();
        return devices.filter((d)=>d.kind === "audioinput");
    }
    updateMic(micId) {
        this._daily.setInputDevicesAsync({
            audioDeviceId: micId
        }).then((infos)=>{
            this._selectedMic = infos.mic;
        });
    }
    get selectedMic() {
        return this._selectedMic;
    }
    enableMic(enable) {
        this._daily.setLocalAudio(enable);
    }
    get isMicEnabled() {
        return this._daily.localAudio();
    }
    enableCam(enable) {
        this._daily.setLocalVideo(enable);
    }
    get isCamEnabled() {
        return this._daily.localVideo();
    }
    tracks() {
        const participants = this._daily?.participants() ?? {};
        const bot = participants?.[this._botId];
        const tracks = {
            local: {
                audio: participants?.local?.tracks?.audio?.persistentTrack,
                video: participants?.local?.tracks?.video?.persistentTrack
            }
        };
        if (bot) tracks.bot = {
            audio: bot?.tracks?.audio?.persistentTrack,
            video: bot?.tracks?.video?.persistentTrack
        };
        return tracks;
    }
    async initDevices() {
        if (!this._daily) throw new (0, $8zHUo$realtimeai.RTVIError)("Transport instance not initialized");
        this.state = "initializing";
        const infos = await this._daily.startCamera();
        const { devices: devices } = await this._daily.enumerateDevices();
        const cams = devices.filter((d)=>d.kind === "videoinput");
        const mics = devices.filter((d)=>d.kind === "audioinput");
        this._callbacks.onAvailableCamsUpdated?.(cams);
        this._callbacks.onAvailableMicsUpdated?.(mics);
        this._selectedCam = infos.camera;
        this._callbacks.onCamUpdated?.(infos.camera);
        this._selectedMic = infos.mic;
        this._callbacks.onMicUpdated?.(infos.mic);
        // Instantiate audio observers
        if (!this._daily.isLocalAudioLevelObserverRunning()) await this._daily.startLocalAudioLevelObserver(100);
        if (!this._daily.isRemoteParticipantsAudioLevelObserverRunning()) await this._daily.startRemoteParticipantsAudioLevelObserver(100);
        this.state = "initialized";
    }
    async connect(authBundle, abortController) {
        if (!this._daily) throw new (0, $8zHUo$realtimeai.RTVIError)("Transport instance not initialized");
        if (abortController.signal.aborted) return;
        this.state = "connecting";
        try {
            await this._daily.join({
                url: authBundle.room_url,
                token: authBundle.token
            });
            const room = await this._daily.room();
            if (room && "id" in room) this._expiry = room.config?.exp;
        } catch (e) {
            this.state = "error";
            throw new (0, $8zHUo$realtimeai.TransportStartError)();
        }
        if (abortController.signal.aborted) return;
        this.state = "connected";
        this._callbacks.onConnected?.();
    }
    async sendReadyMessage() {
        return new Promise((resolve)=>{
            (async ()=>{
                this._daily.on("track-started", (ev)=>{
                    if (!ev.participant?.local) {
                        this.state = "ready";
                        this.sendMessage((0, $8zHUo$realtimeai.RTVIMessage).clientReady());
                        resolve();
                    }
                });
            })();
        });
    }
    attachEventListeners() {
        this._daily.on("available-devices-updated", this.handleAvailableDevicesUpdated.bind(this));
        this._daily.on("selected-devices-updated", this.handleSelectedDevicesUpdated.bind(this));
        this._daily.on("track-started", this.handleTrackStarted.bind(this));
        this._daily.on("track-stopped", this.handleTrackStopped.bind(this));
        this._daily.on("participant-joined", this.handleParticipantJoined.bind(this));
        this._daily.on("participant-left", this.handleParticipantLeft.bind(this));
        this._daily.on("local-audio-level", this.handleLocalAudioLevel.bind(this));
        this._daily.on("remote-participants-audio-level", this.handleRemoteAudioLevel.bind(this));
        this._daily.on("app-message", this.handleAppMessage.bind(this));
        this._daily.on("left-meeting", this.handleLeftMeeting.bind(this));
    }
    async disconnect() {
        this._daily.stopLocalAudioLevelObserver();
        this._daily.stopRemoteParticipantsAudioLevelObserver();
        await this._daily.leave();
        await this._daily.destroy();
    }
    sendMessage(message) {
        this._daily.sendAppMessage(message, "*");
    }
    handleAppMessage(ev) {
        // Bubble any messages with rtvi-ai label
        if (ev.data.label === "rtvi-ai") this._onMessage({
            id: ev.data.id,
            type: ev.data.type,
            data: ev.data.data
        });
    }
    handleAvailableDevicesUpdated(ev) {
        this._callbacks.onAvailableCamsUpdated?.(ev.availableDevices.filter((d)=>d.kind === "videoinput"));
        this._callbacks.onAvailableMicsUpdated?.(ev.availableDevices.filter((d)=>d.kind === "audioinput"));
    }
    handleSelectedDevicesUpdated(ev) {
        if (this._selectedCam?.deviceId !== ev.devices.camera) {
            this._selectedCam = ev.devices.camera;
            this._callbacks.onCamUpdated?.(ev.devices.camera);
        }
        if (this._selectedMic?.deviceId !== ev.devices.mic) {
            this._selectedMic = ev.devices.mic;
            this._callbacks.onMicUpdated?.(ev.devices.mic);
        }
    }
    handleTrackStarted(ev) {
        this._callbacks.onTrackStarted?.(ev.track, ev.participant ? $bbd4e85ccc0fdffc$var$dailyParticipantToParticipant(ev.participant) : undefined);
    }
    handleTrackStopped(ev) {
        this._callbacks.onTrackStopped?.(ev.track, ev.participant ? $bbd4e85ccc0fdffc$var$dailyParticipantToParticipant(ev.participant) : undefined);
    }
    handleParticipantJoined(ev) {
        const p = $bbd4e85ccc0fdffc$var$dailyParticipantToParticipant(ev.participant);
        this._callbacks.onParticipantJoined?.(p);
        if (p.local) return;
        this._botId = ev.participant.session_id;
        this._callbacks.onBotConnected?.(p);
    }
    handleParticipantLeft(ev) {
        const p = $bbd4e85ccc0fdffc$var$dailyParticipantToParticipant(ev.participant);
        this._callbacks.onParticipantLeft?.(p);
        if (p.local) return;
        this._botId = "";
        this._callbacks.onBotDisconnected?.(p);
    }
    handleLocalAudioLevel(ev) {
        this._callbacks.onLocalAudioLevel?.(ev.audioLevel);
    }
    handleRemoteAudioLevel(ev) {
        const participants = this._daily.participants();
        const ids = Object.keys(ev.participantsAudioLevel);
        for(let i = 0; i < ids.length; i++){
            const id = ids[i];
            const level = ev.participantsAudioLevel[id];
            this._callbacks.onRemoteAudioLevel?.(level, $bbd4e85ccc0fdffc$var$dailyParticipantToParticipant(participants[id]));
        }
    }
    handleLeftMeeting() {
        this.state = "disconnecting";
        this._botId = "";
        this._callbacks.onDisconnected?.();
    }
}
const $bbd4e85ccc0fdffc$var$dailyParticipantToParticipant = (p)=>({
        id: p.user_id,
        local: p.local,
        name: p.user_name
    });


$parcel$exportWildcard(module.exports, $bbd4e85ccc0fdffc$exports);




},{"@daily-co/daily-js":7,"realtime-ai":13}],9:[function(require,module,exports){
'use strict';

/**
 * Module dependenices
 */

const clone = require('shallow-clone');
const typeOf = require('kind-of');
const isPlainObject = require('is-plain-object');

function cloneDeep(val, instanceClone) {
  switch (typeOf(val)) {
    case 'object':
      return cloneObjectDeep(val, instanceClone);
    case 'array':
      return cloneArrayDeep(val, instanceClone);
    default: {
      return clone(val);
    }
  }
}

function cloneObjectDeep(val, instanceClone) {
  if (typeof instanceClone === 'function') {
    return instanceClone(val);
  }
  if (instanceClone || isPlainObject(val)) {
    const res = new val.constructor();
    for (let key in val) {
      res[key] = cloneDeep(val[key], instanceClone);
    }
    return res;
  }
  return val;
}

function cloneArrayDeep(val, instanceClone) {
  const res = new val.constructor(val.length);
  for (let i = 0; i < val.length; i++) {
    res[i] = cloneDeep(val[i], instanceClone);
  }
  return res;
}

/**
 * Expose `cloneDeep`
 */

module.exports = cloneDeep;

},{"is-plain-object":10,"kind-of":12,"shallow-clone":14}],10:[function(require,module,exports){
/*!
 * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */

'use strict';

var isObject = require('isobject');

function isObjectObject(o) {
  return isObject(o) === true
    && Object.prototype.toString.call(o) === '[object Object]';
}

module.exports = function isPlainObject(o) {
  var ctor,prot;

  if (isObjectObject(o) === false) return false;

  // If has modified constructor
  ctor = o.constructor;
  if (typeof ctor !== 'function') return false;

  // If has modified prototype
  prot = ctor.prototype;
  if (isObjectObject(prot) === false) return false;

  // If constructor does not have an Object-specific method
  if (prot.hasOwnProperty('isPrototypeOf') === false) {
    return false;
  }

  // Most likely a plain Object
  return true;
};

},{"isobject":11}],11:[function(require,module,exports){
/*!
 * isobject <https://github.com/jonschlinkert/isobject>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */

'use strict';

module.exports = function isObject(val) {
  return val != null && typeof val === 'object' && Array.isArray(val) === false;
};

},{}],12:[function(require,module,exports){
var toString = Object.prototype.toString;

module.exports = function kindOf(val) {
  if (val === void 0) return 'undefined';
  if (val === null) return 'null';

  var type = typeof val;
  if (type === 'boolean') return 'boolean';
  if (type === 'string') return 'string';
  if (type === 'number') return 'number';
  if (type === 'symbol') return 'symbol';
  if (type === 'function') {
    return isGeneratorFn(val) ? 'generatorfunction' : 'function';
  }

  if (isArray(val)) return 'array';
  if (isBuffer(val)) return 'buffer';
  if (isArguments(val)) return 'arguments';
  if (isDate(val)) return 'date';
  if (isError(val)) return 'error';
  if (isRegexp(val)) return 'regexp';

  switch (ctorName(val)) {
    case 'Symbol': return 'symbol';
    case 'Promise': return 'promise';

    // Set, Map, WeakSet, WeakMap
    case 'WeakMap': return 'weakmap';
    case 'WeakSet': return 'weakset';
    case 'Map': return 'map';
    case 'Set': return 'set';

    // 8-bit typed arrays
    case 'Int8Array': return 'int8array';
    case 'Uint8Array': return 'uint8array';
    case 'Uint8ClampedArray': return 'uint8clampedarray';

    // 16-bit typed arrays
    case 'Int16Array': return 'int16array';
    case 'Uint16Array': return 'uint16array';

    // 32-bit typed arrays
    case 'Int32Array': return 'int32array';
    case 'Uint32Array': return 'uint32array';
    case 'Float32Array': return 'float32array';
    case 'Float64Array': return 'float64array';
  }

  if (isGeneratorObj(val)) {
    return 'generator';
  }

  // Non-plain objects
  type = toString.call(val);
  switch (type) {
    case '[object Object]': return 'object';
    // iterators
    case '[object Map Iterator]': return 'mapiterator';
    case '[object Set Iterator]': return 'setiterator';
    case '[object String Iterator]': return 'stringiterator';
    case '[object Array Iterator]': return 'arrayiterator';
  }

  // other
  return type.slice(8, -1).toLowerCase().replace(/\s/g, '');
};

function ctorName(val) {
  return typeof val.constructor === 'function' ? val.constructor.name : null;
}

function isArray(val) {
  if (Array.isArray) return Array.isArray(val);
  return val instanceof Array;
}

function isError(val) {
  return val instanceof Error || (typeof val.message === 'string' && val.constructor && typeof val.constructor.stackTraceLimit === 'number');
}

function isDate(val) {
  if (val instanceof Date) return true;
  return typeof val.toDateString === 'function'
    && typeof val.getDate === 'function'
    && typeof val.setDate === 'function';
}

function isRegexp(val) {
  if (val instanceof RegExp) return true;
  return typeof val.flags === 'string'
    && typeof val.ignoreCase === 'boolean'
    && typeof val.multiline === 'boolean'
    && typeof val.global === 'boolean';
}

function isGeneratorFn(name, val) {
  return ctorName(name) === 'GeneratorFunction';
}

function isGeneratorObj(val) {
  return typeof val.throw === 'function'
    && typeof val.return === 'function'
    && typeof val.next === 'function';
}

function isArguments(val) {
  try {
    if (typeof val.length === 'number' && typeof val.callee === 'function') {
      return true;
    }
  } catch (err) {
    if (err.message.indexOf('callee') !== -1) {
      return true;
    }
  }
  return false;
}

/**
 * If you need to support Safari 5-7 (8-10 yr-old browser),
 * take a look at https://github.com/feross/is-buffer
 */

function isBuffer(val) {
  if (val.constructor && typeof val.constructor.isBuffer === 'function') {
    return val.constructor.isBuffer(val);
  }
  return false;
}

},{}],13:[function(require,module,exports){
var $8pRN5$clonedeep = require("clone-deep");
var $8pRN5$events = require("events");
var $8pRN5$uuid = require("uuid");


function $parcel$exportWildcard(dest, source) {
  Object.keys(source).forEach(function(key) {
    if (key === 'default' || key === '__esModule' || Object.prototype.hasOwnProperty.call(dest, key)) {
      return;
    }

    Object.defineProperty(dest, key, {
      enumerable: true,
      get: function get() {
        return source[key];
      }
    });
  });

  return dest;
}

function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}

function $parcel$interopDefault(a) {
  return a && a.__esModule ? a.default : a;
}
var $6be1d9cb0e2360df$exports = {};

$parcel$export($6be1d9cb0e2360df$exports, "httpActionGenerator", () => $6be1d9cb0e2360df$export$8728b60ea57bf43e);

async function $6be1d9cb0e2360df$export$8728b60ea57bf43e(actionUrl, action, params, handleResponse) {
    try {
        console.debug("[RTVI] Fetch action", actionUrl, action);
        const headers = new Headers({
            ...Object.fromEntries((params.headers ?? new Headers()).entries())
        });
        if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
        headers.set("Cache-Control", "no-cache");
        headers.set("Connection", "keep-alive");
        // Perform the fetch request
        const response = await fetch(actionUrl, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                ...params.requestData,
                actions: [
                    action
                ]
            })
        });
        // Check the response content type
        const contentType = response.headers.get("content-type");
        // Handle non-ok response status
        if (!response.ok) {
            const errorMessage = await response.text();
            throw new (0, $8ff2e31cdda82d5f$export$59b4786f333aac02)(`Failed to resolve action: ${errorMessage}`, response.status);
        }
        if (response.body && contentType?.includes("text/event-stream")) {
            // Parse streamed responses
            const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
            let buffer = "";
            while(true){
                const { value: value, done: done } = await reader.read();
                if (done) break;
                buffer += value;
                let boundary = buffer.indexOf("\n\n");
                while(boundary !== -1){
                    const message = buffer.slice(0, boundary);
                    buffer = buffer.slice(boundary + 2);
                    // Split on the first ":" to extract the JSON part
                    const lines = message.split("\n");
                    let encodedData = "";
                    for (const line of lines){
                        const colonIndex = line.indexOf(":");
                        if (colonIndex !== -1) encodedData += line.slice(colonIndex + 1).trim();
                    }
                    try {
                        const jsonData = atob(encodedData);
                        const parsedData = JSON.parse(jsonData);
                        handleResponse(parsedData);
                    } catch (error) {
                        console.error("[RTVI] Failed to parse JSON:", error);
                        throw error;
                    }
                    boundary = buffer.indexOf("\n\n");
                }
            }
        } else {
            // For regular non-streamed responses, parse and handle the data as JSON
            const data = await response.json();
            handleResponse(data);
        }
    } catch (error) {
        console.error("[RTVI] Error during fetch:", error);
        throw error;
    }
} /*
//@TODO: implement abortController when mode changes / bad things happen
export async function dispatchAction(
  this: RTVIClient,
  action: RTVIActionRequest
): Promise<RTVIActionResponse> {
  const promise = new Promise((resolve, reject) => {
    (async () => {
      if (this.connected) {
        return this._messageDispatcher.dispatch(action);
      } else {
        const actionUrl = this.constructUrl("action");
        try {
          const result = await httpActionGenerator(
            actionUrl,
            action,
            this.params,
            (response) => {
              this.handleMessage(response);
            }
          );
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }
    })();
  });

  return promise as Promise<RTVIActionResponse>;
}
*/ 


var $1e74a0da2f07ac09$exports = {};

$parcel$export($1e74a0da2f07ac09$exports, "RTVIClient", () => $1e74a0da2f07ac09$export$fa42a01c1d60f4a1);


var $3223bbadd9c06ff1$exports = {};
$3223bbadd9c06ff1$exports = JSON.parse('{"name":"realtime-ai","version":"0.2.1","license":"BSD-2-Clause","main":"dist/index.js","module":"dist/index.module.js","types":"dist/index.d.ts","source":"src/index.ts","repository":{"type":"git","url":"git+https://github.com/rtvi-ai/rtvi-client-web.git"},"files":["dist","package.json","README.md"],"scripts":{"build":"jest --silent && parcel build --no-cache","dev":"parcel watch","lint":"eslint src/ --report-unused-disable-directives --max-warnings 0","test":"jest"},"jest":{"preset":"ts-jest","testEnvironment":"node"},"devDependencies":{"@jest/globals":"^29.7.0","@types/clone-deep":"^4.0.4","@types/jest":"^29.5.12","@types/uuid":"^10.0.0","@typescript-eslint/eslint-plugin":"^7.16.0","@typescript-eslint/parser":"^7.16.0","eslint":"9.11.1","eslint-config-prettier":"^9.1.0","eslint-plugin-simple-import-sort":"^12.1.1","jest":"^29.7.0","ts-jest":"^29.2.5"},"dependencies":{"@types/events":"^3.0.3","clone-deep":"^4.0.1","events":"^3.3.0","typed-emitter":"^2.1.0","uuid":"^10.0.0"}}');


var $8ff2e31cdda82d5f$exports = {};

$parcel$export($8ff2e31cdda82d5f$exports, "RTVIError", () => $8ff2e31cdda82d5f$export$59b4786f333aac02);
$parcel$export($8ff2e31cdda82d5f$exports, "ConnectionTimeoutError", () => $8ff2e31cdda82d5f$export$c67992fa684a81a6);
$parcel$export($8ff2e31cdda82d5f$exports, "StartBotError", () => $8ff2e31cdda82d5f$export$e7544ab812238a61);
$parcel$export($8ff2e31cdda82d5f$exports, "TransportStartError", () => $8ff2e31cdda82d5f$export$e0624a511a2c4e9);
$parcel$export($8ff2e31cdda82d5f$exports, "BotNotReadyError", () => $8ff2e31cdda82d5f$export$885fb96b850e8fbb);
$parcel$export($8ff2e31cdda82d5f$exports, "ConfigUpdateError", () => $8ff2e31cdda82d5f$export$4eda4fd287fbbca5);
$parcel$export($8ff2e31cdda82d5f$exports, "VoiceError", () => $8ff2e31cdda82d5f$export$975d7330b0c579b7);
class $8ff2e31cdda82d5f$export$59b4786f333aac02 extends Error {
    constructor(message, status){
        super(message);
        this.status = status;
    }
}
class $8ff2e31cdda82d5f$export$c67992fa684a81a6 extends $8ff2e31cdda82d5f$export$59b4786f333aac02 {
    constructor(message){
        super(message ?? "Bot did not enter ready state within the specified timeout period.");
    }
}
class $8ff2e31cdda82d5f$export$e7544ab812238a61 extends $8ff2e31cdda82d5f$export$59b4786f333aac02 {
    constructor(message, status){
        super(message ?? `Failed to connect / invalid auth bundle from base url`, status ?? 500);
        this.error = "invalid-request-error";
    }
}
class $8ff2e31cdda82d5f$export$e0624a511a2c4e9 extends $8ff2e31cdda82d5f$export$59b4786f333aac02 {
    constructor(message){
        super(message ?? "Unable to connect to transport");
    }
}
class $8ff2e31cdda82d5f$export$885fb96b850e8fbb extends $8ff2e31cdda82d5f$export$59b4786f333aac02 {
    constructor(message){
        super(message ?? "Attempt to call action on transport when not in 'ready' state.");
    }
}
class $8ff2e31cdda82d5f$export$4eda4fd287fbbca5 extends $8ff2e31cdda82d5f$export$59b4786f333aac02 {
    constructor(message){
        super(message ?? "Unable to update configuration");
        this.status = 400;
    }
}
class $8ff2e31cdda82d5f$export$975d7330b0c579b7 extends $8ff2e31cdda82d5f$export$59b4786f333aac02 {
}


function $47710f5255ab06c5$export$f1586721024c4dab(_target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function(...args) {
        if (this.state === "ready") return originalMethod.apply(this, args);
        else throw new (0, $8ff2e31cdda82d5f$export$885fb96b850e8fbb)(`Attempt to call ${propertyKey.toString()} when transport not in ready state. Await connect() first.`);
    };
    return descriptor;
}
function $47710f5255ab06c5$export$808994d0d8c9acb3(states) {
    return function(_target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.get = function(...args) {
            if (states.includes(this.state)) return originalMethod.apply(this, args);
            else throw new (0, $8ff2e31cdda82d5f$export$885fb96b850e8fbb)(`Attempt to call ${propertyKey.toString()} when transport not in ${states}.`);
        };
        return descriptor;
    };
}
function $47710f5255ab06c5$export$5c35b4fe6fa8c9a6(...states) {
    states = [
        "ready",
        ...states
    ];
    return function(_target, propertyKey, descriptor) {
        const originalGetter = descriptor.get;
        descriptor.get = function() {
            if (states.includes(this.state)) return originalGetter?.apply(this);
            else throw new (0, $8ff2e31cdda82d5f$export$885fb96b850e8fbb)(`Attempt to call ${propertyKey.toString()} when transport not in ${states}. Await connect() first.`);
        };
        return descriptor;
    };
}



var $089332d54444b803$exports = {};

$parcel$export($089332d54444b803$exports, "RTVIEvent", () => $089332d54444b803$export$6b4624d233c61fcb);
var $089332d54444b803$export$6b4624d233c61fcb;
(function(RTVIEvent) {
    RTVIEvent["MessageError"] = "messageError";
    RTVIEvent["Error"] = "error";
    RTVIEvent["Connected"] = "connected";
    RTVIEvent["Disconnected"] = "disconnected";
    RTVIEvent["TransportStateChanged"] = "transportStateChanged";
    RTVIEvent["Config"] = "config";
    RTVIEvent["ConfigDescribe"] = "configDescribe";
    RTVIEvent["ActionsAvailable"] = "actionsAvailable";
    RTVIEvent["ParticipantConnected"] = "participantConnected";
    RTVIEvent["ParticipantLeft"] = "participantLeft";
    RTVIEvent["TrackStarted"] = "trackStarted";
    RTVIEvent["TrackedStopped"] = "trackStopped";
    RTVIEvent["AvailableCamsUpdated"] = "availableCamsUpdated";
    RTVIEvent["AvailableMicsUpdated"] = "availableMicsUpdated";
    RTVIEvent["CamUpdated"] = "camUpdated";
    RTVIEvent["MicUpdated"] = "micUpdated";
    RTVIEvent["BotConnected"] = "botConnected";
    RTVIEvent["BotReady"] = "botReady";
    RTVIEvent["BotDisconnected"] = "botDisconnected";
    RTVIEvent["BotStartedSpeaking"] = "botStartedSpeaking";
    RTVIEvent["BotStoppedSpeaking"] = "botStoppedSpeaking";
    RTVIEvent["RemoteAudioLevel"] = "remoteAudioLevel";
    RTVIEvent["UserStartedSpeaking"] = "userStartedSpeaking";
    RTVIEvent["UserStoppedSpeaking"] = "userStoppedSpeaking";
    RTVIEvent["LocalAudioLevel"] = "localAudioLevel";
    RTVIEvent["Metrics"] = "metrics";
    RTVIEvent["UserTranscript"] = "userTranscript";
    RTVIEvent["BotTranscript"] = "botTranscript";
    RTVIEvent["BotLlmText"] = "botLlmText";
    RTVIEvent["BotLlmStarted"] = "botLlmStarted";
    RTVIEvent["BotLlmStopped"] = "botLlmStopped";
    RTVIEvent["BotTtsText"] = "botTtsText";
    RTVIEvent["BotTtsStarted"] = "botTtsStarted";
    RTVIEvent["BotTtsStopped"] = "botTtsStopped";
    RTVIEvent["LLMFunctionCall"] = "llmFunctionCall";
    RTVIEvent["LLMFunctionCallStart"] = "llmFunctionCallStart";
    RTVIEvent["LLMJsonCompletion"] = "llmJsonCompletion";
    RTVIEvent["StorageItemStored"] = "storageItemStored";
    /**
     * @deprecated Use BotLlmText instead
     */ RTVIEvent["BotText"] = "botText";
})($089332d54444b803$export$6b4624d233c61fcb || ($089332d54444b803$export$6b4624d233c61fcb = {}));


var $fa0c275f3b53957a$exports = {};

$parcel$export($fa0c275f3b53957a$exports, "RTVIClientHelper", () => $fa0c275f3b53957a$export$23bc637255b2a471);
class $fa0c275f3b53957a$export$23bc637255b2a471 {
    constructor(options){
        this._options = options;
    }
    set client(client) {
        this._client = client;
    }
    set service(service) {
        this._service = service;
    }
}


var $1759dba477584515$exports = {};

$parcel$export($1759dba477584515$exports, "RTVI_MESSAGE_LABEL", () => $1759dba477584515$export$882b13c7fda338f5);
$parcel$export($1759dba477584515$exports, "RTVIMessageType", () => $1759dba477584515$export$38b3db05cbf0e240);
$parcel$export($1759dba477584515$exports, "RTVIMessage", () => $1759dba477584515$export$69aa9ab0334b212);
$parcel$export($1759dba477584515$exports, "RTVI_ACTION_TYPE", () => $1759dba477584515$export$28ad8d0d400d3e2d);
$parcel$export($1759dba477584515$exports, "RTVIActionRequest", () => $1759dba477584515$export$378529d7a8bead8b);
$parcel$export($1759dba477584515$exports, "MessageDispatcher", () => $1759dba477584515$export$e9a960646cc432aa);
$parcel$export($1759dba477584515$exports, "VoiceMessage", () => $1759dba477584515$export$3336fb47fe34a146);


const $1759dba477584515$export$882b13c7fda338f5 = "rtvi-ai";
var $1759dba477584515$export$38b3db05cbf0e240;
(function(RTVIMessageType) {
    // Outbound
    RTVIMessageType["CLIENT_READY"] = "client-ready";
    RTVIMessageType["UPDATE_CONFIG"] = "update-config";
    RTVIMessageType["GET_CONFIG"] = "get-config";
    RTVIMessageType["DESCRIBE_CONFIG"] = "describe-config";
    RTVIMessageType["DESCRIBE_ACTIONS"] = "describe-actions";
    // Inbound
    RTVIMessageType["BOT_READY"] = "bot-ready";
    RTVIMessageType["ERROR"] = "error";
    RTVIMessageType["ERROR_RESPONSE"] = "error-response";
    RTVIMessageType["CONFIG"] = "config";
    RTVIMessageType["CONFIG_AVAILABLE"] = "config-available";
    RTVIMessageType["CONFIG_ERROR"] = "config-error";
    RTVIMessageType["ACTIONS_AVAILABLE"] = "actions-available";
    RTVIMessageType["ACTION_RESPONSE"] = "action-response";
    RTVIMessageType["METRICS"] = "metrics";
    RTVIMessageType["USER_TRANSCRIPTION"] = "user-transcription";
    RTVIMessageType["BOT_TRANSCRIPTION"] = "bot-transcription";
    RTVIMessageType["USER_STARTED_SPEAKING"] = "user-started-speaking";
    RTVIMessageType["USER_STOPPED_SPEAKING"] = "user-stopped-speaking";
    RTVIMessageType["BOT_STARTED_SPEAKING"] = "bot-started-speaking";
    RTVIMessageType["BOT_STOPPED_SPEAKING"] = "bot-stopped-speaking";
    // Service-specific
    RTVIMessageType["USER_LLM_TEXT"] = "user-llm-text";
    RTVIMessageType["BOT_LLM_TEXT"] = "bot-llm-text";
    RTVIMessageType["BOT_LLM_STARTED"] = "bot-llm-started";
    RTVIMessageType["BOT_LLM_STOPPED"] = "bot-llm-stopped";
    RTVIMessageType["BOT_TTS_TEXT"] = "bot-tts-text";
    RTVIMessageType["BOT_TTS_STARTED"] = "bot-tts-started";
    RTVIMessageType["BOT_TTS_STOPPED"] = "bot-tts-stopped";
    // Storage
    RTVIMessageType["STORAGE_ITEM_STORED"] = "storage-item-stored";
})($1759dba477584515$export$38b3db05cbf0e240 || ($1759dba477584515$export$38b3db05cbf0e240 = {}));
class $1759dba477584515$export$69aa9ab0334b212 {
    constructor(type, data, id){
        this.label = $1759dba477584515$export$882b13c7fda338f5;
        this.type = type;
        this.data = data;
        this.id = id || (0, $8pRN5$uuid.v4)().slice(0, 8);
    }
    // Outbound message types
    static clientReady() {
        return new $1759dba477584515$export$69aa9ab0334b212($1759dba477584515$export$38b3db05cbf0e240.CLIENT_READY, {});
    }
    static updateConfig(config, interrupt = false) {
        return new $1759dba477584515$export$69aa9ab0334b212($1759dba477584515$export$38b3db05cbf0e240.UPDATE_CONFIG, {
            config: config,
            interrupt: interrupt
        });
    }
    static describeConfig() {
        return new $1759dba477584515$export$69aa9ab0334b212($1759dba477584515$export$38b3db05cbf0e240.DESCRIBE_CONFIG, {});
    }
    static getBotConfig() {
        return new $1759dba477584515$export$69aa9ab0334b212($1759dba477584515$export$38b3db05cbf0e240.GET_CONFIG, {});
    }
    static describeActions() {
        return new $1759dba477584515$export$69aa9ab0334b212($1759dba477584515$export$38b3db05cbf0e240.DESCRIBE_ACTIONS, {});
    }
}
const $1759dba477584515$export$28ad8d0d400d3e2d = "action";
class $1759dba477584515$export$378529d7a8bead8b extends $1759dba477584515$export$69aa9ab0334b212 {
    constructor(data){
        super($1759dba477584515$export$28ad8d0d400d3e2d, data);
    }
}
class $1759dba477584515$export$e9a960646cc432aa {
    constructor(client){
        this._queue = new Array();
        this._gcTime = 10000; // How long to wait before resolving the message
        this._queue = [];
        this._client = client;
    }
    dispatch(message) {
        const promise = new Promise((resolve, reject)=>{
            this._queue.push({
                message: message,
                timestamp: Date.now(),
                resolve: resolve,
                reject: reject
            });
        });
        console.debug("[MessageDispatcher] dispatch", message);
        this._client.sendMessage(message);
        this._gc();
        return promise;
    }
    async dispatchAction(action, onMessage) {
        const promise = new Promise((resolve, reject)=>{
            this._queue.push({
                message: action,
                timestamp: Date.now(),
                resolve: resolve,
                reject: reject
            });
        });
        console.debug("[MessageDispatcher] action", action);
        if (this._client.connected) // Send message to transport when connected
        this._client.sendMessage(action);
        else {
            const actionUrl = this._client.constructUrl("action");
            try {
                // Dispatch action via HTTP when disconnected
                await (0, $6be1d9cb0e2360df$export$8728b60ea57bf43e)(actionUrl, action, this._client.params, (response)=>{
                    onMessage(response);
                });
            // On HTTP success (resolve), send `action` message (for callbacks)
            } catch (e) {
                onMessage(new $1759dba477584515$export$69aa9ab0334b212($1759dba477584515$export$38b3db05cbf0e240.ERROR_RESPONSE, `Action endpoint '${actionUrl}' returned an error response`, action.id));
            }
        }
        this._gc();
        return promise;
    }
    _resolveReject(message, resolve = true) {
        const queuedMessage = this._queue.find((msg)=>msg.message.id === message.id);
        if (queuedMessage) {
            if (resolve) {
                console.debug("[MessageDispatcher] Resolve", message);
                queuedMessage.resolve(message.type === $1759dba477584515$export$38b3db05cbf0e240.ACTION_RESPONSE ? message : message);
            } else {
                console.debug("[MessageDispatcher] Reject", message);
                queuedMessage.reject(message);
            }
            // Remove message from queue
            this._queue = this._queue.filter((msg)=>msg.message.id !== message.id);
            console.debug("[MessageDispatcher] Queue", this._queue);
        }
        return message;
    }
    resolve(message) {
        return this._resolveReject(message, true);
    }
    reject(message) {
        return this._resolveReject(message, false);
    }
    _gc() {
        this._queue = this._queue.filter((msg)=>{
            return Date.now() - msg.timestamp < this._gcTime;
        });
        console.debug("[MessageDispatcher] GC", this._queue);
    }
}
class $1759dba477584515$export$3336fb47fe34a146 extends $1759dba477584515$export$69aa9ab0334b212 {
}


var $1e74a0da2f07ac09$var$__decorate = undefined && undefined.__decorate || function(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const $1e74a0da2f07ac09$var$defaultEndpoints = {
    connect: "/connect",
    action: "/action"
};
class $1e74a0da2f07ac09$var$RTVIEventEmitter extends (0, ($parcel$interopDefault($8pRN5$events))) {
}
class $1e74a0da2f07ac09$export$fa42a01c1d60f4a1 extends $1e74a0da2f07ac09$var$RTVIEventEmitter {
    constructor(options){
        super();
        this.params = {
            ...options.params,
            endpoints: {
                ...$1e74a0da2f07ac09$var$defaultEndpoints,
                ...options.params.endpoints ?? {}
            }
        };
        this._helpers = {};
        this._transport = options.transport;
        // Wrap transport callbacks with event triggers
        // This allows for either functional callbacks or .on / .off event listeners
        const wrappedCallbacks = {
            ...options.callbacks,
            onMessageError: (message)=>{
                options?.callbacks?.onMessageError?.(message);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).MessageError, message);
            },
            onError: (message)=>{
                options?.callbacks?.onError?.(message);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).Error, message);
            },
            onConnected: ()=>{
                options?.callbacks?.onConnected?.();
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).Connected);
            },
            onDisconnected: ()=>{
                options?.callbacks?.onDisconnected?.();
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).Disconnected);
            },
            onTransportStateChanged: (state)=>{
                options?.callbacks?.onTransportStateChanged?.(state);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).TransportStateChanged, state);
            },
            onConfig: (config)=>{
                options?.callbacks?.onConfig?.(config);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).Config, config);
            },
            onConfigDescribe: (configDescription)=>{
                options?.callbacks?.onConfigDescribe?.(configDescription);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).ConfigDescribe, configDescription);
            },
            onActionsAvailable: (actionsAvailable)=>{
                options?.callbacks?.onActionsAvailable?.(actionsAvailable);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).ActionsAvailable, actionsAvailable);
            },
            onParticipantJoined: (p)=>{
                options?.callbacks?.onParticipantJoined?.(p);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).ParticipantConnected, p);
            },
            onParticipantLeft: (p)=>{
                options?.callbacks?.onParticipantLeft?.(p);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).ParticipantLeft, p);
            },
            onTrackStarted: (track, p)=>{
                options?.callbacks?.onTrackStarted?.(track, p);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).TrackStarted, track, p);
            },
            onTrackStopped: (track, p)=>{
                options?.callbacks?.onTrackStopped?.(track, p);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).TrackedStopped, track, p);
            },
            onAvailableCamsUpdated: (cams)=>{
                options?.callbacks?.onAvailableCamsUpdated?.(cams);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).AvailableCamsUpdated, cams);
            },
            onAvailableMicsUpdated: (mics)=>{
                options?.callbacks?.onAvailableMicsUpdated?.(mics);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).AvailableMicsUpdated, mics);
            },
            onCamUpdated: (cam)=>{
                options?.callbacks?.onCamUpdated?.(cam);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).CamUpdated, cam);
            },
            onMicUpdated: (mic)=>{
                options?.callbacks?.onMicUpdated?.(mic);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).MicUpdated, mic);
            },
            onBotConnected: (p)=>{
                options?.callbacks?.onBotConnected?.(p);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).BotConnected, p);
            },
            onBotReady: (botReadyData)=>{
                options?.callbacks?.onBotReady?.(botReadyData);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).BotReady, botReadyData);
            },
            onBotDisconnected: (p)=>{
                options?.callbacks?.onBotDisconnected?.(p);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).BotDisconnected, p);
            },
            onBotStartedSpeaking: ()=>{
                options?.callbacks?.onBotStartedSpeaking?.();
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).BotStartedSpeaking);
            },
            onBotStoppedSpeaking: ()=>{
                options?.callbacks?.onBotStoppedSpeaking?.();
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).BotStoppedSpeaking);
            },
            onRemoteAudioLevel: (level, p)=>{
                options?.callbacks?.onRemoteAudioLevel?.(level, p);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).RemoteAudioLevel, level, p);
            },
            onUserStartedSpeaking: ()=>{
                options?.callbacks?.onUserStartedSpeaking?.();
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).UserStartedSpeaking);
            },
            onUserStoppedSpeaking: ()=>{
                options?.callbacks?.onUserStoppedSpeaking?.();
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).UserStoppedSpeaking);
            },
            onLocalAudioLevel: (level)=>{
                options?.callbacks?.onLocalAudioLevel?.(level);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).LocalAudioLevel, level);
            },
            onUserTranscript: (data)=>{
                options?.callbacks?.onUserTranscript?.(data);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).UserTranscript, data);
            },
            onBotTranscript: (text)=>{
                options?.callbacks?.onBotTranscript?.(text);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).BotTranscript, text);
            },
            onBotLlmText: (text)=>{
                options?.callbacks?.onBotLlmText?.(text);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).BotLlmText, text);
            },
            onBotLlmStarted: ()=>{
                options?.callbacks?.onBotLlmStarted?.();
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).BotLlmStarted);
            },
            onBotLlmStopped: ()=>{
                options?.callbacks?.onBotLlmStopped?.();
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).BotLlmStopped);
            },
            onBotTtsText: (text)=>{
                options?.callbacks?.onBotTtsText?.(text);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).BotTtsText, text);
            },
            onBotTtsStarted: ()=>{
                options?.callbacks?.onBotTtsStarted?.();
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).BotTtsStarted);
            },
            onBotTtsStopped: ()=>{
                options?.callbacks?.onBotTtsStopped?.();
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).BotTtsStopped);
            },
            onStorageItemStored: (data)=>{
                options?.callbacks?.onStorageItemStored?.(data);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).StorageItemStored, data);
            },
            /**
             * @deprecated Use BotLlmText instead
             */ onBotText: (text)=>{
                options?.callbacks?.onBotText?.(text);
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).BotText, text);
            }
        };
        // Update options to reference wrapped callbacks and config defaults
        this._options = {
            ...options,
            callbacks: wrappedCallbacks,
            enableMic: options.enableMic ?? true,
            enableCam: options.enableCam ?? false
        };
        // Instantiate the transport class and bind message handler
        this._initialize();
        // Get package version number
        console.debug("[RTVI Client] Initialized", this.version);
    }
    constructUrl(endpoint) {
        if (!this.params.baseUrl) throw new $8ff2e31cdda82d5f$export$59b4786f333aac02("Base URL not set. Please set rtviClient.params.baseUrl");
        const baseUrl = this.params.baseUrl.replace(/\/+$/, "");
        return baseUrl + (this.params.endpoints?.[endpoint] ?? "");
    }
    // ------ Transport methods
    /**
     * Initialize local media devices
     */ async initDevices() {
        console.debug("[RTVI Client] Initializing devices...");
        await this._transport.initDevices();
    }
    /**
     * Connect the voice client session with chosen transport
     * Call async (await) to handle errors
     */ async connect() {
        if ([
            "authenticating",
            "connecting",
            "connected",
            "ready"
        ].includes(this._transport.state)) throw new $8ff2e31cdda82d5f$export$59b4786f333aac02("Voice client has already been started. Please call disconnect() before starting again.");
        this._abortController = new AbortController();
        // Establish transport session and await bot ready signal
        return new Promise((resolve, reject)=>{
            (async ()=>{
                this._startResolve = resolve;
                if (this._transport.state === "disconnected") await this._transport.initDevices();
                this._transport.state = "authenticating";
                // Set a timer for the bot to enter a ready state, otherwise abort the attempt
                if (this._options.timeout) this._handshakeTimeout = setTimeout(async ()=>{
                    this._abortController?.abort();
                    await this.disconnect();
                    this._transport.state = "error";
                    reject(new $8ff2e31cdda82d5f$export$c67992fa684a81a6());
                }, this._options.timeout);
                let authBundle;
                const customConnectHandler = this._options.customConnectHandler;
                const connectUrl = this.constructUrl("connect");
                this.params = {
                    ...this.params,
                    requestData: {
                        ...this.params.requestData,
                        rtvi_client_version: this.version
                    }
                };
                console.debug("[RTVI Client] Connecting...", connectUrl);
                console.debug("[RTVI Client] Start params", this.params);
                try {
                    if (customConnectHandler) authBundle = await customConnectHandler(this.params, this._handshakeTimeout, this._abortController);
                    else authBundle = await fetch(connectUrl, {
                        method: "POST",
                        mode: "cors",
                        headers: new Headers({
                            "Content-Type": "application/json",
                            ...Object.fromEntries((this.params.headers ?? new Headers()).entries())
                        }),
                        body: JSON.stringify({
                            services: this._options.services,
                            config: this.params.config ?? this._options.config,
                            ...this._options.customBodyParams,
                            ...this.params.requestData
                        }),
                        signal: this._abortController?.signal
                    }).then((res)=>{
                        clearTimeout(this._handshakeTimeout);
                        if (res.ok) return res.json();
                        return Promise.reject(res);
                    });
                } catch (e) {
                    clearTimeout(this._handshakeTimeout);
                    // Handle errors if the request was not aborted
                    if (this._abortController?.signal.aborted) return;
                    this._transport.state = "error";
                    if (e instanceof Response) {
                        const errorResp = await e.json();
                        reject(new $8ff2e31cdda82d5f$export$e7544ab812238a61(errorResp.info ?? errorResp.detail ?? e.statusText, e.status));
                    } else reject(new $8ff2e31cdda82d5f$export$e7544ab812238a61());
                    return;
                }
                console.debug("[RTVI Client] Auth bundle received", authBundle);
                try {
                    await this._transport.connect(authBundle, this._abortController);
                } catch (e) {
                    clearTimeout(this._handshakeTimeout);
                    reject(e);
                    return;
                }
                await this._transport.sendReadyMessage();
            })();
        });
    }
    /**
     * Disconnect the voice client from the transport
     * Reset / reinitialize transport and abort any pending requests
     */ async disconnect() {
        if (this._abortController) this._abortController.abort();
        clearTimeout(this._handshakeTimeout);
        await this._transport.disconnect();
        this._initialize();
    }
    _initialize() {
        // Reset transport
        this._transport = this._options.transport;
        this._transport.initialize(this._options, this.handleMessage.bind(this));
        // Create a new message dispatch queue for async message handling
        this._messageDispatcher = new (0, $1759dba477584515$export$e9a960646cc432aa)(this);
    }
    /**
     * Get the current state of the transport
     */ get connected() {
        return [
            "connected",
            "ready"
        ].includes(this._transport.state);
    }
    get state() {
        return this._transport.state;
    }
    get version() {
        return (0, (/*@__PURE__*/$parcel$interopDefault($3223bbadd9c06ff1$exports))).version;
    }
    // ------ Device methods
    async getAllMics() {
        return await this._transport.getAllMics();
    }
    async getAllCams() {
        return await this._transport.getAllCams();
    }
    get selectedMic() {
        return this._transport.selectedMic;
    }
    get selectedCam() {
        return this._transport.selectedCam;
    }
    updateMic(micId) {
        this._transport.updateMic(micId);
    }
    updateCam(camId) {
        this._transport.updateCam(camId);
    }
    enableMic(enable) {
        this._transport.enableMic(enable);
    }
    get isMicEnabled() {
        return this._transport.isMicEnabled;
    }
    enableCam(enable) {
        this._transport.enableCam(enable);
    }
    get isCamEnabled() {
        return this._transport.isCamEnabled;
    }
    tracks() {
        return this._transport.tracks();
    }
    // ------ Config methods
    /**
     * Request the bot to send the current configuration
     * @returns Promise<RTVIClientConfigOption[]> - Promise that resolves with the bot's configuration
     */ async getConfig() {
        const configMsg = await this._messageDispatcher.dispatch((0, $1759dba477584515$export$69aa9ab0334b212).getBotConfig());
        return configMsg.data.config;
    }
    /**
     * Update pipeline and services
     * @param config - RTVIClientConfigOption[] partial object with the new configuration
     * @param interrupt - boolean flag to interrupt the current pipeline, or wait until the next turn
     * @returns Promise<RTVIMessage> - Promise that resolves with the updated configuration
     */ async updateConfig(config, interrupt = false) {
        console.debug("[RTVI Client] Updating config", config);
        // Only send the partial config if the bot is ready to prevent
        // potential racing conditions whilst pipeline is instantiating
        return this._messageDispatcher.dispatch((0, $1759dba477584515$export$69aa9ab0334b212).updateConfig(config, interrupt));
    }
    /**
     * Request bot describe the current configuration options
     * @returns Promise<unknown> - Promise that resolves with the bot's configuration description
     */ async describeConfig() {
        return this._messageDispatcher.dispatch((0, $1759dba477584515$export$69aa9ab0334b212).describeConfig());
    }
    /**
     * Returns configuration options for specified service key
     * @param serviceKey - Service name to get options for (e.g. "llm")
     * @param config? - Optional RTVIClientConfigOption[] to query (vs. using remote config)
     * @returns RTVIClientConfigOption | undefined - Configuration options array for the service with specified key or undefined
     */ async getServiceOptionsFromConfig(serviceKey, config) {
        if (!config && this.state !== "ready") throw new $8ff2e31cdda82d5f$export$885fb96b850e8fbb("getServiceOptionsFromConfig called without config array before bot is ready");
        return Promise.resolve().then(async ()=>{
            // Check if we have registered service with name service
            if (!serviceKey) {
                console.debug("Target service name is required");
                return undefined;
            }
            const passedConfig = config ?? await this.getConfig();
            // Find matching service name in the config and update the messages
            const configServiceKey = passedConfig.find((config)=>config.service === serviceKey);
            if (!configServiceKey) {
                console.debug("No service with name " + serviceKey + " not found in config");
                return undefined;
            }
            // Return a new object, as to not mutate existing state
            return configServiceKey;
        });
    }
    /**
     * Returns configuration option value (unknown) for specified service key and option name
     * @param serviceKey - Service name to get options for (e.g. "llm")
     * @optional option Name of option return from the config (e.g. "model")
     * @returns Promise<unknown | undefined> - Service configuration option value or undefined
     */ async getServiceOptionValueFromConfig(serviceKey, option, config) {
        const configServiceKey = await this.getServiceOptionsFromConfig(serviceKey, config);
        if (!configServiceKey) {
            console.debug("Service with name " + serviceKey + " not found in config");
            return undefined;
        }
        // Find matching option key in the service config
        const optionValue = configServiceKey.options.find((o)=>o.name === option);
        return optionValue ? optionValue.value : undefined;
    }
    _updateOrAddOption(existingOptions, newOption) {
        const existingOptionIndex = existingOptions.findIndex((item)=>item.name === newOption.name);
        if (existingOptionIndex !== -1) // Update existing option
        return existingOptions.map((item, index)=>index === existingOptionIndex ? {
                ...item,
                value: newOption.value
            } : item);
        else // Add new option
        return [
            ...existingOptions,
            {
                name: newOption.name,
                value: newOption.value
            }
        ];
    }
    /**
     * Returns config with updated option(s) for specified service key and option name
     * Note: does not update current config, only returns a new object (call updateConfig to apply changes)
     * @param serviceKey - Service name to get options for (e.g. "llm")
     * @param option - Service name to get options for (e.g. "model")
     * @param config - Optional RTVIClientConfigOption[] to update (vs. using current config)
     * @returns Promise<RTVIClientConfigOption[] | undefined> - Configuration options array with updated option(s) or undefined
     */ async setServiceOptionInConfig(serviceKey, option, config) {
        const newConfig = (0, ($parcel$interopDefault($8pRN5$clonedeep)))(config ?? await this.getConfig());
        const serviceOptions = await this.getServiceOptionsFromConfig(serviceKey, newConfig);
        if (!serviceOptions) {
            console.debug("Service with name '" + serviceKey + "' not found in config");
            return newConfig;
        }
        const optionsArray = Array.isArray(option) ? option : [
            option
        ];
        for (const opt of optionsArray){
            const existingItem = newConfig.find((item)=>item.service === serviceKey);
            const updatedOptions = existingItem ? this._updateOrAddOption(existingItem.options, opt) : [
                {
                    name: opt.name,
                    value: opt.value
                }
            ];
            if (existingItem) existingItem.options = updatedOptions;
            else newConfig.push({
                service: serviceKey,
                options: updatedOptions
            });
        }
        return newConfig;
    }
    /**
     * Returns config object with updated properties from passed array.
     * @param configOptions - Array of RTVIClientConfigOption[] to update
     * @param config? - Optional RTVIClientConfigOption[] to update (vs. using current config)
     * @returns Promise<RTVIClientConfigOption[]> - Configuration options
     */ async setConfigOptions(configOptions, config) {
        let accumulator = (0, ($parcel$interopDefault($8pRN5$clonedeep)))(config ?? await this.getConfig());
        for (const configOption of configOptions)accumulator = await this.setServiceOptionInConfig(configOption.service, configOption.options, accumulator) || accumulator;
        return accumulator;
    }
    // ------ Actions
    /**
     * Dispatch an action message to the bot or http single-turn endpoint
     */ async action(action) {
        return this._messageDispatcher.dispatchAction(new (0, $1759dba477584515$export$378529d7a8bead8b)(action), this.handleMessage.bind(this));
    }
    /**
     * Describe available / registered actions the bot has
     * @returns Promise<unknown> - Promise that resolves with the bot's actions
     */ async describeActions() {
        return this._messageDispatcher.dispatch((0, $1759dba477584515$export$69aa9ab0334b212).describeActions());
    }
    // ------ Transport methods
    /**
     * Get the session expiry time for the transport session (if applicable)
     * @returns number - Expiry time in milliseconds
     */ get transportExpiry() {
        return this._transport.expiry;
    }
    // ------ Messages
    /**
     * Directly send a message to the bot via the transport
     * @param message - RTVIMessage object to send
     */ sendMessage(message) {
        this._transport.sendMessage(message);
    }
    handleMessage(ev) {
        console.debug("[RTVI Message]", ev);
        switch(ev.type){
            case (0, $1759dba477584515$export$38b3db05cbf0e240).BOT_READY:
                clearTimeout(this._handshakeTimeout);
                this._startResolve?.(ev.data);
                this._options.callbacks?.onBotReady?.(ev.data);
                break;
            case (0, $1759dba477584515$export$38b3db05cbf0e240).CONFIG_AVAILABLE:
                this._messageDispatcher.resolve(ev);
                this._options.callbacks?.onConfigDescribe?.(ev.data);
                break;
            case (0, $1759dba477584515$export$38b3db05cbf0e240).CONFIG:
                {
                    const resp = this._messageDispatcher.resolve(ev);
                    this._options.callbacks?.onConfig?.(resp.data.config);
                    break;
                }
            case (0, $1759dba477584515$export$38b3db05cbf0e240).ACTIONS_AVAILABLE:
                this._messageDispatcher.resolve(ev);
                this._options.callbacks?.onActionsAvailable?.(ev.data);
                break;
            case (0, $1759dba477584515$export$38b3db05cbf0e240).ACTION_RESPONSE:
                this._messageDispatcher.resolve(ev);
                break;
            case (0, $1759dba477584515$export$38b3db05cbf0e240).ERROR_RESPONSE:
                {
                    const resp = this._messageDispatcher.reject(ev);
                    this._options.callbacks?.onMessageError?.(resp);
                    break;
                }
            case (0, $1759dba477584515$export$38b3db05cbf0e240).ERROR:
                this._options.callbacks?.onError?.(ev);
                break;
            case (0, $1759dba477584515$export$38b3db05cbf0e240).USER_STARTED_SPEAKING:
                this._options.callbacks?.onUserStartedSpeaking?.();
                break;
            case (0, $1759dba477584515$export$38b3db05cbf0e240).USER_STOPPED_SPEAKING:
                this._options.callbacks?.onUserStoppedSpeaking?.();
                break;
            case (0, $1759dba477584515$export$38b3db05cbf0e240).BOT_STARTED_SPEAKING:
                this._options.callbacks?.onBotStartedSpeaking?.();
                break;
            case (0, $1759dba477584515$export$38b3db05cbf0e240).BOT_STOPPED_SPEAKING:
                this._options.callbacks?.onBotStoppedSpeaking?.();
                break;
            case (0, $1759dba477584515$export$38b3db05cbf0e240).USER_TRANSCRIPTION:
                {
                    const TranscriptData = ev.data;
                    this._options.callbacks?.onUserTranscript?.(TranscriptData);
                    break;
                }
            case (0, $1759dba477584515$export$38b3db05cbf0e240).BOT_TRANSCRIPTION:
                this._options.callbacks?.onBotTranscript?.(ev.data);
                break;
            case (0, $1759dba477584515$export$38b3db05cbf0e240).BOT_LLM_TEXT:
                this._options.callbacks?.onBotLlmText?.(ev.data);
                this._options.callbacks?.onBotText?.(ev.data); // @deprecated
                break;
            case (0, $1759dba477584515$export$38b3db05cbf0e240).BOT_LLM_STARTED:
                this._options.callbacks?.onBotLlmStarted?.();
                break;
            case (0, $1759dba477584515$export$38b3db05cbf0e240).BOT_LLM_STOPPED:
                this._options.callbacks?.onBotLlmStopped?.();
                break;
            case (0, $1759dba477584515$export$38b3db05cbf0e240).BOT_TTS_TEXT:
                this._options.callbacks?.onBotTtsText?.(ev.data);
                break;
            case (0, $1759dba477584515$export$38b3db05cbf0e240).BOT_TTS_STARTED:
                this._options.callbacks?.onBotTtsStarted?.();
                break;
            case (0, $1759dba477584515$export$38b3db05cbf0e240).BOT_TTS_STOPPED:
                this._options.callbacks?.onBotTtsStopped?.();
                break;
            case (0, $1759dba477584515$export$38b3db05cbf0e240).METRICS:
                this.emit((0, $089332d54444b803$export$6b4624d233c61fcb).Metrics, ev.data);
                this._options.callbacks?.onMetrics?.(ev.data);
                break;
            case (0, $1759dba477584515$export$38b3db05cbf0e240).STORAGE_ITEM_STORED:
                this._options.callbacks?.onStorageItemStored?.(ev.data);
                break;
            default:
                {
                    let match = false;
                    // Pass message to registered helpers
                    for (const helper of Object.values(this._helpers))if (helper.getMessageTypes().includes(ev.type)) {
                        match = true;
                        helper.handleMessage(ev);
                    }
                    if (!match) this._options.callbacks?.onGenericMessage?.(ev.data);
                }
        }
    }
    // ------ Helpers
    /**
     * Register a new helper to the client
     * This (optionally) provides a way to reference helpers directly
     * from the client and use the event dispatcher
     * @param service - Target service for this helper
     * @param helper - Helper instance
     * @returns RTVIClientHelper - Registered helper instance
     */ registerHelper(service, helper) {
        if (this._helpers[service]) throw new Error(`Helper with name '${service}' already registered`);
        // Check helper is instance of RTVIClientHelper
        if (!(helper instanceof (0, $fa0c275f3b53957a$export$23bc637255b2a471))) throw new Error(`Helper must be an instance of RTVIClientHelper`);
        helper.service = service;
        helper.client = this;
        this._helpers[service] = helper;
        return this._helpers[service];
    }
    getHelper(service) {
        const helper = this._helpers[service];
        if (!helper) {
            console.debug(`Helper targeting service '${service}' not found`);
            return undefined;
        }
        return helper;
    }
    unregisterHelper(service) {
        if (!this._helpers[service]) return;
        delete this._helpers[service];
    }
    // ------ Deprecated
    /**
     * @deprecated use connect() instead
     */ async start() {
        return this.connect();
    }
    /**
     * @deprecated use getConfig instead
     * @returns Promise<RTVIClientConfigOption[]> - Promise that resolves with the bot's configuration
     */ async getBotConfig() {
        console.warn("VoiceClient.getBotConfig is deprecated. Use getConfig instead.");
        return this.getConfig();
    }
    /**
     * @deprecated This getter is deprecated and will be removed in future versions. Use getConfig instead.
     * Current client configuration
     * For the most up-to-date configuration, use getBotConfig method
     * @returns RTVIClientConfigOption[] - Array of configuration options
     */ get config() {
        console.warn("VoiceClient.config is deprecated. Use getConfig instead.");
        return this._options.config;
    }
    /**
     * Get registered services from voice client constructor options
     * @deprecated Services not accessible via the client instance
     */ get services() {
        console.warn("VoiceClient.services is deprecated.");
        return this._options.services;
    }
    /**
     * @deprecated Services not accessible via the client instance
     */ set services(services) {
        console.warn("VoiceClient.services is deprecated.");
        if (![
            "authenticating",
            "connecting",
            "connected",
            "ready"
        ].includes(this._transport.state)) this._options.services = services;
        else throw new $8ff2e31cdda82d5f$export$59b4786f333aac02("Cannot set services while transport is connected");
    }
}
$1e74a0da2f07ac09$var$__decorate([
    (0, $47710f5255ab06c5$export$f1586721024c4dab)
], $1e74a0da2f07ac09$export$fa42a01c1d60f4a1.prototype, "getConfig", null);
$1e74a0da2f07ac09$var$__decorate([
    (0, $47710f5255ab06c5$export$f1586721024c4dab)
], $1e74a0da2f07ac09$export$fa42a01c1d60f4a1.prototype, "updateConfig", null);
$1e74a0da2f07ac09$var$__decorate([
    (0, $47710f5255ab06c5$export$f1586721024c4dab)
], $1e74a0da2f07ac09$export$fa42a01c1d60f4a1.prototype, "describeConfig", null);
$1e74a0da2f07ac09$var$__decorate([
    (0, $47710f5255ab06c5$export$f1586721024c4dab)
], $1e74a0da2f07ac09$export$fa42a01c1d60f4a1.prototype, "describeActions", null);
$1e74a0da2f07ac09$var$__decorate([
    (0, $47710f5255ab06c5$export$5c35b4fe6fa8c9a6)("connected", "ready")
], $1e74a0da2f07ac09$export$fa42a01c1d60f4a1.prototype, "transportExpiry", null);
$1e74a0da2f07ac09$var$__decorate([
    (0, $47710f5255ab06c5$export$f1586721024c4dab)
], $1e74a0da2f07ac09$export$fa42a01c1d60f4a1.prototype, "sendMessage", null);
$1e74a0da2f07ac09$var$__decorate([
    (0, $47710f5255ab06c5$export$f1586721024c4dab)
], $1e74a0da2f07ac09$export$fa42a01c1d60f4a1.prototype, "getBotConfig", null);





var $a41e9bfc073bea32$exports = {};

$parcel$export($a41e9bfc073bea32$exports, "LLMMessageType", () => $a41e9bfc073bea32$export$441bcd2e10762760);
$parcel$export($a41e9bfc073bea32$exports, "LLMHelper", () => $a41e9bfc073bea32$export$3cf39a62d076dd5c);




var $a41e9bfc073bea32$export$441bcd2e10762760;
(function(LLMMessageType) {
    LLMMessageType["LLM_FUNCTION_CALL"] = "llm-function-call";
    LLMMessageType["LLM_FUNCTION_CALL_START"] = "llm-function-call-start";
    LLMMessageType["LLM_FUNCTION_CALL_RESULT"] = "llm-function-call-result";
    LLMMessageType["LLM_JSON_COMPLETION"] = "llm-json-completion";
})($a41e9bfc073bea32$export$441bcd2e10762760 || ($a41e9bfc073bea32$export$441bcd2e10762760 = {}));
class $a41e9bfc073bea32$export$3cf39a62d076dd5c extends (0, $fa0c275f3b53957a$export$23bc637255b2a471) {
    constructor(options){
        super(options);
        this._functionCallCallback = null;
    }
    getMessageTypes() {
        return Object.values($a41e9bfc073bea32$export$441bcd2e10762760);
    }
    // --- Actions
    /**
     * Retrieve the bot's current LLM context.
     * @returns Promise<LLMContext>
     */ async getContext() {
        if (this._client.state !== "ready") throw new $8ff2e31cdda82d5f$export$885fb96b850e8fbb("getContext called while transport not in ready state");
        const actionResponseMsg = await this._client.action({
            service: this._service,
            action: "get_context"
        });
        return actionResponseMsg.data.result;
    }
    /**
     * Update the bot's LLM context.
     * If this is called while the transport is not in the ready state, the local context will be updated
     * @param context LLMContext - The new context
     * @param interrupt boolean - Whether to interrupt the bot, or wait until it has finished speaking
     * @returns Promise<boolean>
     */ async setContext(context, interrupt = false) {
        if (this._client.state !== "ready") throw new $8ff2e31cdda82d5f$export$885fb96b850e8fbb("setContext called while transport not in ready state");
        const actionResponse = await this._client.action({
            service: this._service,
            action: "set_context",
            arguments: [
                {
                    name: "messages",
                    value: context.messages
                },
                {
                    name: "interrupt",
                    value: interrupt
                }
            ]
        });
        return !!actionResponse.data.result;
    }
    /**
     * Append a new message to the LLM context.
     * If this is called while the transport is not in the ready state, the local context will be updated
     * @param context LLMContextMessage
     * @param runImmediately boolean - wait until pipeline is idle before running
     * @returns boolean
     */ async appendToMessages(context, runImmediately = false) {
        if (this._client.state !== "ready") throw new $8ff2e31cdda82d5f$export$885fb96b850e8fbb("setContext called while transport not in ready state");
        const actionResponse = await this._client.action({
            service: this._service,
            action: "append_to_messages",
            arguments: [
                {
                    name: "messages",
                    value: [
                        context
                    ]
                },
                {
                    name: "run_immediately",
                    value: runImmediately
                }
            ]
        });
        return !!actionResponse.data.result;
    }
    /**
     * Run the bot's current LLM context.
     * Useful when appending messages to the context without runImmediately set to true.
     * Will do nothing if the bot is not in the ready state.
     * @param interrupt boolean - Whether to interrupt the bot, or wait until it has finished speaking
     * @returns Promise<unknown>
     */ async run(interrupt = false) {
        if (this._client.state !== "ready") return;
        return this._client.action({
            service: this._service,
            action: "run",
            arguments: [
                {
                    name: "interrupt",
                    value: interrupt
                }
            ]
        });
    }
    // --- Handlers
    /**
     * If the LLM wants to call a function, RTVI will invoke the callback defined
     * here. Whatever the callback returns will be sent to the LLM as the function result.
     * @param callback
     * @returns void
     */ handleFunctionCall(callback) {
        this._functionCallCallback = callback;
    }
    handleMessage(ev) {
        switch(ev.type){
            case $a41e9bfc073bea32$export$441bcd2e10762760.LLM_JSON_COMPLETION:
                this._options.callbacks?.onLLMJsonCompletion?.(ev.data);
                this._client.emit((0, $089332d54444b803$export$6b4624d233c61fcb).LLMJsonCompletion, ev.data);
                break;
            case $a41e9bfc073bea32$export$441bcd2e10762760.LLM_FUNCTION_CALL:
                {
                    const d = ev.data;
                    this._options.callbacks?.onLLMFunctionCall?.(ev.data);
                    this._client.emit((0, $089332d54444b803$export$6b4624d233c61fcb).LLMFunctionCall, ev.data);
                    if (this._functionCallCallback) {
                        const fn = {
                            functionName: d.function_name,
                            arguments: d.args
                        };
                        if (this._client.state === "ready") this._functionCallCallback(fn).then((result)=>{
                            this._client.sendMessage(new (0, $1759dba477584515$export$69aa9ab0334b212)($a41e9bfc073bea32$export$441bcd2e10762760.LLM_FUNCTION_CALL_RESULT, {
                                function_name: d.function_name,
                                tool_call_id: d.tool_call_id,
                                arguments: d.args,
                                result: result
                            }));
                        });
                        else throw new $8ff2e31cdda82d5f$export$885fb96b850e8fbb("Attempted to send a function call result from bot while transport not in ready state");
                    }
                    break;
                }
            case $a41e9bfc073bea32$export$441bcd2e10762760.LLM_FUNCTION_CALL_START:
                {
                    const e = ev.data;
                    this._options.callbacks?.onLLMFunctionCallStart?.(e.function_name);
                    this._client.emit((0, $089332d54444b803$export$6b4624d233c61fcb).LLMFunctionCallStart, e.function_name);
                    break;
                }
        }
    }
}



var $d28fed3f945857b6$exports = {};

$parcel$export($d28fed3f945857b6$exports, "Transport", () => $d28fed3f945857b6$export$86495b081fef8e52);
class $d28fed3f945857b6$export$86495b081fef8e52 {
    constructor(){
        this._state = "disconnected";
        this._expiry = undefined;
    }
    get expiry() {
        return this._expiry;
    }
}


$parcel$exportWildcard(module.exports, $6be1d9cb0e2360df$exports);
$parcel$exportWildcard(module.exports, $1e74a0da2f07ac09$exports);
$parcel$exportWildcard(module.exports, $8ff2e31cdda82d5f$exports);
$parcel$exportWildcard(module.exports, $089332d54444b803$exports);
$parcel$exportWildcard(module.exports, $fa0c275f3b53957a$exports);
$parcel$exportWildcard(module.exports, $a41e9bfc073bea32$exports);
$parcel$exportWildcard(module.exports, $1759dba477584515$exports);
$parcel$exportWildcard(module.exports, $d28fed3f945857b6$exports);




},{"clone-deep":9,"events":3,"uuid":15}],14:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * shallow-clone <https://github.com/jonschlinkert/shallow-clone>
 *
 * Copyright (c) 2015-present, Jon Schlinkert.
 * Released under the MIT License.
 */

'use strict';

const valueOf = Symbol.prototype.valueOf;
const typeOf = require('kind-of');

function clone(val, deep) {
  switch (typeOf(val)) {
    case 'array':
      return val.slice();
    case 'object':
      return Object.assign({}, val);
    case 'date':
      return new val.constructor(Number(val));
    case 'map':
      return new Map(val);
    case 'set':
      return new Set(val);
    case 'buffer':
      return cloneBuffer(val);
    case 'symbol':
      return cloneSymbol(val);
    case 'arraybuffer':
      return cloneArrayBuffer(val);
    case 'float32array':
    case 'float64array':
    case 'int16array':
    case 'int32array':
    case 'int8array':
    case 'uint16array':
    case 'uint32array':
    case 'uint8clampedarray':
    case 'uint8array':
      return cloneTypedArray(val);
    case 'regexp':
      return cloneRegExp(val);
    case 'error':
      return Object.create(val);
    default: {
      return val;
    }
  }
}

function cloneRegExp(val) {
  const flags = val.flags !== void 0 ? val.flags : (/\w+$/.exec(val) || void 0);
  const re = new val.constructor(val.source, flags);
  re.lastIndex = val.lastIndex;
  return re;
}

function cloneArrayBuffer(val) {
  const res = new val.constructor(val.byteLength);
  new Uint8Array(res).set(new Uint8Array(val));
  return res;
}

function cloneTypedArray(val, deep) {
  return new val.constructor(val.buffer, val.byteOffset, val.length);
}

function cloneBuffer(val) {
  const len = val.length;
  const buf = Buffer.allocUnsafe ? Buffer.allocUnsafe(len) : Buffer.from(len);
  val.copy(buf);
  return buf;
}

function cloneSymbol(val) {
  return valueOf ? Object(valueOf.call(val)) : {};
}

/**
 * Expose `clone`
 */

module.exports = clone;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":2,"kind-of":12}],15:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "MAX", {
  enumerable: true,
  get: function () {
    return _max.default;
  }
});
Object.defineProperty(exports, "NIL", {
  enumerable: true,
  get: function () {
    return _nil.default;
  }
});
Object.defineProperty(exports, "parse", {
  enumerable: true,
  get: function () {
    return _parse.default;
  }
});
Object.defineProperty(exports, "stringify", {
  enumerable: true,
  get: function () {
    return _stringify.default;
  }
});
Object.defineProperty(exports, "v1", {
  enumerable: true,
  get: function () {
    return _v.default;
  }
});
Object.defineProperty(exports, "v1ToV6", {
  enumerable: true,
  get: function () {
    return _v1ToV.default;
  }
});
Object.defineProperty(exports, "v3", {
  enumerable: true,
  get: function () {
    return _v2.default;
  }
});
Object.defineProperty(exports, "v4", {
  enumerable: true,
  get: function () {
    return _v3.default;
  }
});
Object.defineProperty(exports, "v5", {
  enumerable: true,
  get: function () {
    return _v4.default;
  }
});
Object.defineProperty(exports, "v6", {
  enumerable: true,
  get: function () {
    return _v5.default;
  }
});
Object.defineProperty(exports, "v6ToV1", {
  enumerable: true,
  get: function () {
    return _v6ToV.default;
  }
});
Object.defineProperty(exports, "v7", {
  enumerable: true,
  get: function () {
    return _v6.default;
  }
});
Object.defineProperty(exports, "validate", {
  enumerable: true,
  get: function () {
    return _validate.default;
  }
});
Object.defineProperty(exports, "version", {
  enumerable: true,
  get: function () {
    return _version.default;
  }
});
var _max = _interopRequireDefault(require("./max.js"));
var _nil = _interopRequireDefault(require("./nil.js"));
var _parse = _interopRequireDefault(require("./parse.js"));
var _stringify = _interopRequireDefault(require("./stringify.js"));
var _v = _interopRequireDefault(require("./v1.js"));
var _v1ToV = _interopRequireDefault(require("./v1ToV6.js"));
var _v2 = _interopRequireDefault(require("./v3.js"));
var _v3 = _interopRequireDefault(require("./v4.js"));
var _v4 = _interopRequireDefault(require("./v5.js"));
var _v5 = _interopRequireDefault(require("./v6.js"));
var _v6ToV = _interopRequireDefault(require("./v6ToV1.js"));
var _v6 = _interopRequireDefault(require("./v7.js"));
var _validate = _interopRequireDefault(require("./validate.js"));
var _version = _interopRequireDefault(require("./version.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
},{"./max.js":16,"./nil.js":19,"./parse.js":20,"./stringify.js":24,"./v1.js":25,"./v1ToV6.js":26,"./v3.js":27,"./v4.js":29,"./v5.js":30,"./v6.js":31,"./v6ToV1.js":32,"./v7.js":33,"./validate.js":34,"./version.js":35}],16:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _default = exports.default = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
},{}],17:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
/*
 * Browser-compatible JavaScript MD5
 *
 * Modification of JavaScript MD5
 * https://github.com/blueimp/JavaScript-MD5
 *
 * Copyright 2011, Sebastian Tschan
 * https://blueimp.net
 *
 * Licensed under the MIT license:
 * https://opensource.org/licenses/MIT
 *
 * Based on
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */
function md5(bytes) {
  if (typeof bytes === 'string') {
    const msg = unescape(encodeURIComponent(bytes)); // UTF8 escape

    bytes = new Uint8Array(msg.length);
    for (let i = 0; i < msg.length; ++i) {
      bytes[i] = msg.charCodeAt(i);
    }
  }
  return md5ToHexEncodedArray(wordsToMd5(bytesToWords(bytes), bytes.length * 8));
}

/*
 * Convert an array of little-endian words to an array of bytes
 */
function md5ToHexEncodedArray(input) {
  const output = [];
  const length32 = input.length * 32;
  const hexTab = '0123456789abcdef';
  for (let i = 0; i < length32; i += 8) {
    const x = input[i >> 5] >>> i % 32 & 0xff;
    const hex = parseInt(hexTab.charAt(x >>> 4 & 0x0f) + hexTab.charAt(x & 0x0f), 16);
    output.push(hex);
  }
  return output;
}

/**
 * Calculate output length with padding and bit length
 */
function getOutputLength(inputLength8) {
  return (inputLength8 + 64 >>> 9 << 4) + 14 + 1;
}

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length.
 */
function wordsToMd5(x, len) {
  /* append padding */
  x[len >> 5] |= 0x80 << len % 32;
  x[getOutputLength(len) - 1] = len;
  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let d = 271733878;
  for (let i = 0; i < x.length; i += 16) {
    const olda = a;
    const oldb = b;
    const oldc = c;
    const oldd = d;
    a = md5ff(a, b, c, d, x[i], 7, -680876936);
    d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
    c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
    b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
    a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
    d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
    c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
    b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
    a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
    d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
    c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
    b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
    a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
    d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
    c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
    b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
    a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
    d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
    c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
    b = md5gg(b, c, d, a, x[i], 20, -373897302);
    a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
    d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
    c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
    b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
    a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
    d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
    c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
    b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
    a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
    d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
    c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
    b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
    a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
    d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
    c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
    b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
    a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
    d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
    c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
    b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
    a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
    d = md5hh(d, a, b, c, x[i], 11, -358537222);
    c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
    b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
    a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
    d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
    c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
    b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
    a = md5ii(a, b, c, d, x[i], 6, -198630844);
    d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
    c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
    b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
    a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
    d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
    c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
    b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
    a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
    d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
    c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
    b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
    a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
    d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
    c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
    b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
    a = safeAdd(a, olda);
    b = safeAdd(b, oldb);
    c = safeAdd(c, oldc);
    d = safeAdd(d, oldd);
  }
  return [a, b, c, d];
}

/*
 * Convert an array bytes to an array of little-endian words
 * Characters >255 have their high-byte silently ignored.
 */
function bytesToWords(input) {
  if (input.length === 0) {
    return [];
  }
  const length8 = input.length * 8;
  const output = new Uint32Array(getOutputLength(length8));
  for (let i = 0; i < length8; i += 8) {
    output[i >> 5] |= (input[i / 8] & 0xff) << i % 32;
  }
  return output;
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safeAdd(x, y) {
  const lsw = (x & 0xffff) + (y & 0xffff);
  const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return msw << 16 | lsw & 0xffff;
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bitRotateLeft(num, cnt) {
  return num << cnt | num >>> 32 - cnt;
}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5cmn(q, a, b, x, s, t) {
  return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
}
function md5ff(a, b, c, d, x, s, t) {
  return md5cmn(b & c | ~b & d, a, b, x, s, t);
}
function md5gg(a, b, c, d, x, s, t) {
  return md5cmn(b & d | c & ~d, a, b, x, s, t);
}
function md5hh(a, b, c, d, x, s, t) {
  return md5cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5ii(a, b, c, d, x, s, t) {
  return md5cmn(c ^ (b | ~d), a, b, x, s, t);
}
var _default = exports.default = md5;
},{}],18:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
const randomUUID = typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID.bind(crypto);
var _default = exports.default = {
  randomUUID
};
},{}],19:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _default = exports.default = '00000000-0000-0000-0000-000000000000';
},{}],20:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _validate = _interopRequireDefault(require("./validate.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function parse(uuid) {
  if (!(0, _validate.default)(uuid)) {
    throw TypeError('Invalid UUID');
  }
  let v;
  const arr = new Uint8Array(16);

  // Parse ########-....-....-....-............
  arr[0] = (v = parseInt(uuid.slice(0, 8), 16)) >>> 24;
  arr[1] = v >>> 16 & 0xff;
  arr[2] = v >>> 8 & 0xff;
  arr[3] = v & 0xff;

  // Parse ........-####-....-....-............
  arr[4] = (v = parseInt(uuid.slice(9, 13), 16)) >>> 8;
  arr[5] = v & 0xff;

  // Parse ........-....-####-....-............
  arr[6] = (v = parseInt(uuid.slice(14, 18), 16)) >>> 8;
  arr[7] = v & 0xff;

  // Parse ........-....-....-####-............
  arr[8] = (v = parseInt(uuid.slice(19, 23), 16)) >>> 8;
  arr[9] = v & 0xff;

  // Parse ........-....-....-....-############
  // (Use "/" to avoid 32-bit truncation when bit-shifting high-order bytes)
  arr[10] = (v = parseInt(uuid.slice(24, 36), 16)) / 0x10000000000 & 0xff;
  arr[11] = v / 0x100000000 & 0xff;
  arr[12] = v >>> 24 & 0xff;
  arr[13] = v >>> 16 & 0xff;
  arr[14] = v >>> 8 & 0xff;
  arr[15] = v & 0xff;
  return arr;
}
var _default = exports.default = parse;
},{"./validate.js":34}],21:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _default = exports.default = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;
},{}],22:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = rng;
// Unique ID creation requires a high quality random # generator. In the browser we therefore
// require the crypto API and do not support built-in fallback to lower quality random number
// generators (like Math.random()).

let getRandomValues;
const rnds8 = new Uint8Array(16);
function rng() {
  // lazy load so that environments that need to polyfill have a chance to do so
  if (!getRandomValues) {
    // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation.
    getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto);
    if (!getRandomValues) {
      throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
    }
  }
  return getRandomValues(rnds8);
}
},{}],23:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
// Adapted from Chris Veness' SHA1 code at
// http://www.movable-type.co.uk/scripts/sha1.html
function f(s, x, y, z) {
  switch (s) {
    case 0:
      return x & y ^ ~x & z;
    case 1:
      return x ^ y ^ z;
    case 2:
      return x & y ^ x & z ^ y & z;
    case 3:
      return x ^ y ^ z;
  }
}
function ROTL(x, n) {
  return x << n | x >>> 32 - n;
}
function sha1(bytes) {
  const K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
  const H = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
  if (typeof bytes === 'string') {
    const msg = unescape(encodeURIComponent(bytes)); // UTF8 escape

    bytes = [];
    for (let i = 0; i < msg.length; ++i) {
      bytes.push(msg.charCodeAt(i));
    }
  } else if (!Array.isArray(bytes)) {
    // Convert Array-like to Array
    bytes = Array.prototype.slice.call(bytes);
  }
  bytes.push(0x80);
  const l = bytes.length / 4 + 2;
  const N = Math.ceil(l / 16);
  const M = new Array(N);
  for (let i = 0; i < N; ++i) {
    const arr = new Uint32Array(16);
    for (let j = 0; j < 16; ++j) {
      arr[j] = bytes[i * 64 + j * 4] << 24 | bytes[i * 64 + j * 4 + 1] << 16 | bytes[i * 64 + j * 4 + 2] << 8 | bytes[i * 64 + j * 4 + 3];
    }
    M[i] = arr;
  }
  M[N - 1][14] = (bytes.length - 1) * 8 / Math.pow(2, 32);
  M[N - 1][14] = Math.floor(M[N - 1][14]);
  M[N - 1][15] = (bytes.length - 1) * 8 & 0xffffffff;
  for (let i = 0; i < N; ++i) {
    const W = new Uint32Array(80);
    for (let t = 0; t < 16; ++t) {
      W[t] = M[i][t];
    }
    for (let t = 16; t < 80; ++t) {
      W[t] = ROTL(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
    }
    let a = H[0];
    let b = H[1];
    let c = H[2];
    let d = H[3];
    let e = H[4];
    for (let t = 0; t < 80; ++t) {
      const s = Math.floor(t / 20);
      const T = ROTL(a, 5) + f(s, b, c, d) + e + K[s] + W[t] >>> 0;
      e = d;
      d = c;
      c = ROTL(b, 30) >>> 0;
      b = a;
      a = T;
    }
    H[0] = H[0] + a >>> 0;
    H[1] = H[1] + b >>> 0;
    H[2] = H[2] + c >>> 0;
    H[3] = H[3] + d >>> 0;
    H[4] = H[4] + e >>> 0;
  }
  return [H[0] >> 24 & 0xff, H[0] >> 16 & 0xff, H[0] >> 8 & 0xff, H[0] & 0xff, H[1] >> 24 & 0xff, H[1] >> 16 & 0xff, H[1] >> 8 & 0xff, H[1] & 0xff, H[2] >> 24 & 0xff, H[2] >> 16 & 0xff, H[2] >> 8 & 0xff, H[2] & 0xff, H[3] >> 24 & 0xff, H[3] >> 16 & 0xff, H[3] >> 8 & 0xff, H[3] & 0xff, H[4] >> 24 & 0xff, H[4] >> 16 & 0xff, H[4] >> 8 & 0xff, H[4] & 0xff];
}
var _default = exports.default = sha1;
},{}],24:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
exports.unsafeStringify = unsafeStringify;
var _validate = _interopRequireDefault(require("./validate.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
const byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 0x100).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  // Note: Be careful editing this code!  It's been tuned for performance
  // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
  //
  // Note to future-self: No, you can't remove the `toLowerCase()` call.
  // REF: https://github.com/uuidjs/uuid/pull/677#issuecomment-1757351351
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}
function stringify(arr, offset = 0) {
  const uuid = unsafeStringify(arr, offset);
  // Consistency check for valid UUID.  If this throws, it's likely due to one
  // of the following:
  // - One or more input array values don't map to a hex octet (leading to
  // "undefined" in the uuid)
  // - Invalid input values for the RFC `version` or `variant` fields
  if (!(0, _validate.default)(uuid)) {
    throw TypeError('Stringified UUID is invalid');
  }
  return uuid;
}
var _default = exports.default = stringify;
},{"./validate.js":34}],25:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _rng = _interopRequireDefault(require("./rng.js"));
var _stringify = require("./stringify.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

let _nodeId;
let _clockseq;

// Previous uuid creation time
let _lastMSecs = 0;
let _lastNSecs = 0;

// See https://github.com/uuidjs/uuid for API details
function v1(options, buf, offset) {
  let i = buf && offset || 0;
  const b = buf || new Array(16);
  options = options || {};
  let node = options.node;
  let clockseq = options.clockseq;

  // v1 only: Use cached `node` and `clockseq` values
  if (!options._v6) {
    if (!node) {
      node = _nodeId;
    }
    if (clockseq == null) {
      clockseq = _clockseq;
    }
  }

  // Handle cases where we need entropy.  We do this lazily to minimize issues
  // related to insufficient system entropy.  See #189
  if (node == null || clockseq == null) {
    const seedBytes = options.random || (options.rng || _rng.default)();

    // Randomize node
    if (node == null) {
      node = [seedBytes[0], seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];

      // v1 only: cache node value for reuse
      if (!_nodeId && !options._v6) {
        // per RFC4122 4.5: Set MAC multicast bit (v1 only)
        node[0] |= 0x01; // Set multicast bit

        _nodeId = node;
      }
    }

    // Randomize clockseq
    if (clockseq == null) {
      // Per 4.2.2, randomize (14 bit) clockseq
      clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
      if (_clockseq === undefined && !options._v6) {
        _clockseq = clockseq;
      }
    }
  }

  // v1 & v6 timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so time is
  // handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  let msecs = options.msecs !== undefined ? options.msecs : Date.now();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  let nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  const dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
  }
  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  const tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  const tmh = msecs / 0x100000000 * 10000 & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  for (let n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }
  return buf || (0, _stringify.unsafeStringify)(b);
}
var _default = exports.default = v1;
},{"./rng.js":22,"./stringify.js":24}],26:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = v1ToV6;
var _parse = _interopRequireDefault(require("./parse.js"));
var _stringify = require("./stringify.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * Convert a v1 UUID to a v6 UUID
 *
 * @param {string|Uint8Array} uuid - The v1 UUID to convert to v6
 * @returns {string|Uint8Array} The v6 UUID as the same type as the `uuid` arg
 * (string or Uint8Array)
 */
function v1ToV6(uuid) {
  const v1Bytes = typeof uuid === 'string' ? (0, _parse.default)(uuid) : uuid;
  const v6Bytes = _v1ToV6(v1Bytes);
  return typeof uuid === 'string' ? (0, _stringify.unsafeStringify)(v6Bytes) : v6Bytes;
}

// Do the field transformation needed for v1 -> v6
function _v1ToV6(v1Bytes, randomize = false) {
  return Uint8Array.of((v1Bytes[6] & 0x0f) << 4 | v1Bytes[7] >> 4 & 0x0f, (v1Bytes[7] & 0x0f) << 4 | (v1Bytes[4] & 0xf0) >> 4, (v1Bytes[4] & 0x0f) << 4 | (v1Bytes[5] & 0xf0) >> 4, (v1Bytes[5] & 0x0f) << 4 | (v1Bytes[0] & 0xf0) >> 4, (v1Bytes[0] & 0x0f) << 4 | (v1Bytes[1] & 0xf0) >> 4, (v1Bytes[1] & 0x0f) << 4 | (v1Bytes[2] & 0xf0) >> 4, 0x60 | v1Bytes[2] & 0x0f, v1Bytes[3], v1Bytes[8], v1Bytes[9], v1Bytes[10], v1Bytes[11], v1Bytes[12], v1Bytes[13], v1Bytes[14], v1Bytes[15]);
}
},{"./parse.js":20,"./stringify.js":24}],27:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _v = _interopRequireDefault(require("./v35.js"));
var _md = _interopRequireDefault(require("./md5.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const v3 = (0, _v.default)('v3', 0x30, _md.default);
var _default = exports.default = v3;
},{"./md5.js":17,"./v35.js":28}],28:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.URL = exports.DNS = void 0;
exports.default = v35;
var _stringify = require("./stringify.js");
var _parse = _interopRequireDefault(require("./parse.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function stringToBytes(str) {
  str = unescape(encodeURIComponent(str)); // UTF8 escape

  const bytes = [];
  for (let i = 0; i < str.length; ++i) {
    bytes.push(str.charCodeAt(i));
  }
  return bytes;
}
const DNS = exports.DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const URL = exports.URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
function v35(name, version, hashfunc) {
  function generateUUID(value, namespace, buf, offset) {
    var _namespace;
    if (typeof value === 'string') {
      value = stringToBytes(value);
    }
    if (typeof namespace === 'string') {
      namespace = (0, _parse.default)(namespace);
    }
    if (((_namespace = namespace) === null || _namespace === void 0 ? void 0 : _namespace.length) !== 16) {
      throw TypeError('Namespace must be array-like (16 iterable integer values, 0-255)');
    }

    // Compute hash of namespace and value, Per 4.3
    // Future: Use spread syntax when supported on all platforms, e.g. `bytes =
    // hashfunc([...namespace, ... value])`
    let bytes = new Uint8Array(16 + value.length);
    bytes.set(namespace);
    bytes.set(value, namespace.length);
    bytes = hashfunc(bytes);
    bytes[6] = bytes[6] & 0x0f | version;
    bytes[8] = bytes[8] & 0x3f | 0x80;
    if (buf) {
      offset = offset || 0;
      for (let i = 0; i < 16; ++i) {
        buf[offset + i] = bytes[i];
      }
      return buf;
    }
    return (0, _stringify.unsafeStringify)(bytes);
  }

  // Function#name is not settable on some platforms (#270)
  try {
    generateUUID.name = name;
  } catch (err) {}

  // For CommonJS default export support
  generateUUID.DNS = DNS;
  generateUUID.URL = URL;
  return generateUUID;
}
},{"./parse.js":20,"./stringify.js":24}],29:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _native = _interopRequireDefault(require("./native.js"));
var _rng = _interopRequireDefault(require("./rng.js"));
var _stringify = require("./stringify.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function v4(options, buf, offset) {
  if (_native.default.randomUUID && !buf && !options) {
    return _native.default.randomUUID();
  }
  options = options || {};
  const rnds = options.random || (options.rng || _rng.default)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = rnds[6] & 0x0f | 0x40;
  rnds[8] = rnds[8] & 0x3f | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    offset = offset || 0;
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return (0, _stringify.unsafeStringify)(rnds);
}
var _default = exports.default = v4;
},{"./native.js":18,"./rng.js":22,"./stringify.js":24}],30:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _v = _interopRequireDefault(require("./v35.js"));
var _sha = _interopRequireDefault(require("./sha1.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const v5 = (0, _v.default)('v5', 0x50, _sha.default);
var _default = exports.default = v5;
},{"./sha1.js":23,"./v35.js":28}],31:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = v6;
var _stringify = require("./stringify.js");
var _v = _interopRequireDefault(require("./v1.js"));
var _v1ToV = _interopRequireDefault(require("./v1ToV6.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 *
 * @param {object} options
 * @param {Uint8Array=} buf
 * @param {number=} offset
 * @returns
 */
function v6(options = {}, buf, offset = 0) {
  // v6 is v1 with different field layout, so we start with a v1 UUID, albeit
  // with slightly different behavior around how the clock_seq and node fields
  // are randomized, which is why we call v1 with _v6: true.
  let bytes = (0, _v.default)({
    ...options,
    _v6: true
  }, new Uint8Array(16));

  // Reorder the fields to v6 layout.
  bytes = (0, _v1ToV.default)(bytes);

  // Return as a byte array if requested
  if (buf) {
    for (let i = 0; i < 16; i++) {
      buf[offset + i] = bytes[i];
    }
    return buf;
  }
  return (0, _stringify.unsafeStringify)(bytes);
}
},{"./stringify.js":24,"./v1.js":25,"./v1ToV6.js":26}],32:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = v6ToV1;
var _parse = _interopRequireDefault(require("./parse.js"));
var _stringify = require("./stringify.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * Convert a v6 UUID to a v1 UUID
 *
 * @param {string|Uint8Array} uuid - The v6 UUID to convert to v6
 * @returns {string|Uint8Array} The v1 UUID as the same type as the `uuid` arg
 * (string or Uint8Array)
 */
function v6ToV1(uuid) {
  const v6Bytes = typeof uuid === 'string' ? (0, _parse.default)(uuid) : uuid;
  const v1Bytes = _v6ToV1(v6Bytes);
  return typeof uuid === 'string' ? (0, _stringify.unsafeStringify)(v1Bytes) : v1Bytes;
}

// Do the field transformation needed for v6 -> v1
function _v6ToV1(v6Bytes) {
  return Uint8Array.of((v6Bytes[3] & 0x0f) << 4 | v6Bytes[4] >> 4 & 0x0f, (v6Bytes[4] & 0x0f) << 4 | (v6Bytes[5] & 0xf0) >> 4, (v6Bytes[5] & 0x0f) << 4 | v6Bytes[6] & 0x0f, v6Bytes[7], (v6Bytes[1] & 0x0f) << 4 | (v6Bytes[2] & 0xf0) >> 4, (v6Bytes[2] & 0x0f) << 4 | (v6Bytes[3] & 0xf0) >> 4, 0x10 | (v6Bytes[0] & 0xf0) >> 4, (v6Bytes[0] & 0x0f) << 4 | (v6Bytes[1] & 0xf0) >> 4, v6Bytes[8], v6Bytes[9], v6Bytes[10], v6Bytes[11], v6Bytes[12], v6Bytes[13], v6Bytes[14], v6Bytes[15]);
}
},{"./parse.js":20,"./stringify.js":24}],33:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _rng = _interopRequireDefault(require("./rng.js"));
var _stringify = require("./stringify.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * UUID V7 - Unix Epoch time-based UUID
 *
 * The IETF has published RFC9562, introducing 3 new UUID versions (6,7,8). This
 * implementation of V7 is based on the accepted, though not yet approved,
 * revisions.
 *
 * RFC 9562:https://www.rfc-editor.org/rfc/rfc9562.html Universally Unique
 * IDentifiers (UUIDs)

 *
 * Sample V7 value:
 * https://www.rfc-editor.org/rfc/rfc9562.html#name-example-of-a-uuidv7-value
 *
 * Monotonic Bit Layout: RFC rfc9562.6.2 Method 1, Dedicated Counter Bits ref:
 *     https://www.rfc-editor.org/rfc/rfc9562.html#section-6.2-5.1
 *
 *   0                   1                   2                   3 0 1 2 3 4 5 6
 *   7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |                          unix_ts_ms                           |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |          unix_ts_ms           |  ver  |        seq_hi         |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |var|               seq_low               |        rand         |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |                             rand                              |
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *
 * seq is a 31 bit serialized counter; comprised of 12 bit seq_hi and 19 bit
 * seq_low, and randomly initialized upon timestamp change. 31 bit counter size
 * was selected as any bitwise operations in node are done as _signed_ 32 bit
 * ints. we exclude the sign bit.
 */

let _seqLow = null;
let _seqHigh = null;
let _msecs = 0;
function v7(options, buf, offset) {
  options = options || {};

  // initialize buffer and pointer
  let i = buf && offset || 0;
  const b = buf || new Uint8Array(16);

  // rnds is Uint8Array(16) filled with random bytes
  const rnds = options.random || (options.rng || _rng.default)();

  // milliseconds since unix epoch, 1970-01-01 00:00
  const msecs = options.msecs !== undefined ? options.msecs : Date.now();

  // seq is user provided 31 bit counter
  let seq = options.seq !== undefined ? options.seq : null;

  // initialize local seq high/low parts
  let seqHigh = _seqHigh;
  let seqLow = _seqLow;

  // check if clock has advanced and user has not provided msecs
  if (msecs > _msecs && options.msecs === undefined) {
    _msecs = msecs;

    // unless user provided seq, reset seq parts
    if (seq !== null) {
      seqHigh = null;
      seqLow = null;
    }
  }

  // if we have a user provided seq
  if (seq !== null) {
    // trim provided seq to 31 bits of value, avoiding overflow
    if (seq > 0x7fffffff) {
      seq = 0x7fffffff;
    }

    // split provided seq into high/low parts
    seqHigh = seq >>> 19 & 0xfff;
    seqLow = seq & 0x7ffff;
  }

  // randomly initialize seq
  if (seqHigh === null || seqLow === null) {
    seqHigh = rnds[6] & 0x7f;
    seqHigh = seqHigh << 8 | rnds[7];
    seqLow = rnds[8] & 0x3f; // pad for var
    seqLow = seqLow << 8 | rnds[9];
    seqLow = seqLow << 5 | rnds[10] >>> 3;
  }

  // increment seq if within msecs window
  if (msecs + 10000 > _msecs && seq === null) {
    if (++seqLow > 0x7ffff) {
      seqLow = 0;
      if (++seqHigh > 0xfff) {
        seqHigh = 0;

        // increment internal _msecs. this allows us to continue incrementing
        // while staying monotonic. Note, once we hit 10k milliseconds beyond system
        // clock, we will reset breaking monotonicity (after (2^31)*10000 generations)
        _msecs++;
      }
    }
  } else {
    // resetting; we have advanced more than
    // 10k milliseconds beyond system clock
    _msecs = msecs;
  }
  _seqHigh = seqHigh;
  _seqLow = seqLow;

  // [bytes 0-5] 48 bits of local timestamp
  b[i++] = _msecs / 0x10000000000 & 0xff;
  b[i++] = _msecs / 0x100000000 & 0xff;
  b[i++] = _msecs / 0x1000000 & 0xff;
  b[i++] = _msecs / 0x10000 & 0xff;
  b[i++] = _msecs / 0x100 & 0xff;
  b[i++] = _msecs & 0xff;

  // [byte 6] - set 4 bits of version (7) with first 4 bits seq_hi
  b[i++] = seqHigh >>> 4 & 0x0f | 0x70;

  // [byte 7] remaining 8 bits of seq_hi
  b[i++] = seqHigh & 0xff;

  // [byte 8] - variant (2 bits), first 6 bits seq_low
  b[i++] = seqLow >>> 13 & 0x3f | 0x80;

  // [byte 9] 8 bits seq_low
  b[i++] = seqLow >>> 5 & 0xff;

  // [byte 10] remaining 5 bits seq_low, 3 bits random
  b[i++] = seqLow << 3 & 0xff | rnds[10] & 0x07;

  // [bytes 11-15] always random
  b[i++] = rnds[11];
  b[i++] = rnds[12];
  b[i++] = rnds[13];
  b[i++] = rnds[14];
  b[i++] = rnds[15];
  return buf || (0, _stringify.unsafeStringify)(b);
}
var _default = exports.default = v7;
},{"./rng.js":22,"./stringify.js":24}],34:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _regex = _interopRequireDefault(require("./regex.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function validate(uuid) {
  return typeof uuid === 'string' && _regex.default.test(uuid);
}
var _default = exports.default = validate;
},{"./regex.js":21}],35:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _validate = _interopRequireDefault(require("./validate.js"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function version(uuid) {
  if (!(0, _validate.default)(uuid)) {
    throw TypeError('Invalid UUID');
  }
  return parseInt(uuid.slice(14, 15), 16);
}
var _default = exports.default = version;
},{"./validate.js":34}]},{},[6]);

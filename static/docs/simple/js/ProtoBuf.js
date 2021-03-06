
/*
 ProtoBuf.js (c) 2013 Daniel Wirtz <dcode@dcode.io>
 Released under the Apache License, Version 2.0
 see: https://github.com/dcodeIO/ProtoBuf.js for details
*/
(function(s) {
    function u(n) {
        var f = {
            VERSION: "4.0.0-pre",
            WIRE_TYPES: {}
        };
        f.WIRE_TYPES.VARINT = 0;
        f.WIRE_TYPES.BITS64 = 1;
        f.WIRE_TYPES.LDELIM = 2;
        f.WIRE_TYPES.STARTGROUP = 3;
        f.WIRE_TYPES.ENDGROUP = 4;
        f.WIRE_TYPES.BITS32 = 5;
        f.PACKABLE_WIRE_TYPES = [f.WIRE_TYPES.VARINT, f.WIRE_TYPES.BITS64, f.WIRE_TYPES.BITS32];
        f.TYPES = {
            int32: {
                name: "int32",
                wireType: f.WIRE_TYPES.VARINT
            },
            uint32: {
                name: "uint32",
                wireType: f.WIRE_TYPES.VARINT
            },
            sint32: {
                name: "sint32",
                wireType: f.WIRE_TYPES.VARINT
            },
            int64: {
                name: "int64",
                wireType: f.WIRE_TYPES.VARINT
            },
            uint64: {
                name: "uint64",
                wireType: f.WIRE_TYPES.VARINT
            },
            sint64: {
                name: "sint64",
                wireType: f.WIRE_TYPES.VARINT
            },
            bool: {
                name: "bool",
                wireType: f.WIRE_TYPES.VARINT
            },
            "double": {
                name: "double",
                wireType: f.WIRE_TYPES.BITS64
            },
            string: {
                name: "string",
                wireType: f.WIRE_TYPES.LDELIM
            },
            bytes: {
                name: "bytes",
                wireType: f.WIRE_TYPES.LDELIM
            },
            fixed32: {
                name: "fixed32",
                wireType: f.WIRE_TYPES.BITS32
            },
            sfixed32: {
                name: "sfixed32",
                wireType: f.WIRE_TYPES.BITS32
            },
            fixed64: {
                name: "fixed64",
                wireType: f.WIRE_TYPES.BITS64
            },
            sfixed64: {
                name: "sfixed64",
                wireType: f.WIRE_TYPES.BITS64
            },
            "float": {
                name: "float",
                wireType: f.WIRE_TYPES.BITS32
            },
            "enum": {
                name: "enum",
                wireType: f.WIRE_TYPES.VARINT
            },
            message: {
                name: "message",
                wireType: f.WIRE_TYPES.LDELIM
            },
            group: {
                name: "group",
                wireType: f.WIRE_TYPES.STARTGROUP
            }
        };
        f.ID_MIN = 1;
        f.ID_MAX = 536870911;
        f.ByteBuffer = n;
        f.Long = n.Long || null;
        f.convertFieldsToCamelCase = !1;
        f.populateAccessors = !0;
        f.Util = function() {
            Object.create || (Object.create = function(c) {
                function e() {}
                if (1 < arguments.length) throw Error("Object.create polyfill only accepts the first parameter.");
                e.prototype =
                    c;
                return new e
            });
            var c = {
                IS_NODE: !1
            };
            try {
                c.IS_NODE = "function" === typeof require && "function" === typeof require("fs").readFileSync && "function" === typeof require("path").resolve
            } catch (e) {}
            c.XHR = function() {
                for (var c = [function() {
                        return new XMLHttpRequest
                    }, function() {
                        return new ActiveXObject("Msxml2.XMLHTTP")
                    }, function() {
                        return new ActiveXObject("Msxml3.XMLHTTP")
                    }, function() {
                        return new ActiveXObject("Microsoft.XMLHTTP")
                    }], e = null, f = 0; f < c.length; f++) {
                    try {
                        e = c[f]()
                    } catch (b) {
                        continue
                    }
                    break
                }
                if (!e) throw Error("XMLHttpRequest is not supported");
                return e
            };
            c.fetch = function(e, f) {
                f && "function" != typeof f && (f = null);
                if (c.IS_NODE)
                    if (f) require("fs").readFile(e, function(d, a) {
                        d ? f(null) : f("" + a)
                    });
                    else try {
                        return require("fs").readFileSync(e)
                    } catch (q) {
                        return null
                    } else {
                        var b = c.XHR();
                        b.open("GET", e, f ? !0 : !1);
                        b.setRequestHeader("Accept", "text/plain");
                        "function" === typeof b.overrideMimeType && b.overrideMimeType("text/plain");
                        if (f) b.onreadystatechange = function() {
                            4 == b.readyState && (200 == b.status || 0 == b.status && "string" === typeof b.responseText ? f(b.responseText) :
                                f(null))
                        }, 4 != b.readyState && b.send(null);
                        else return b.send(null), 200 == b.status || 0 == b.status && "string" === typeof b.responseText ? b.responseText : null
                    }
            };
            c.isArray = Array.isArray || function(c) {
                return "[object Array]" === Object.prototype.toString.call(c)
            };
            return c
        }();
        f.Lang = {
            OPEN: "{",
            CLOSE: "}",
            OPTOPEN: "[",
            OPTCLOSE: "]",
            OPTEND: ",",
            EQUAL: "=",
            END: ";",
            STRINGOPEN: '"',
            STRINGCLOSE: '"',
            STRINGOPEN_SQ: "'",
            STRINGCLOSE_SQ: "'",
            COPTOPEN: "(",
            COPTCLOSE: ")",
            DELIM: /[\s\{\}=;\[\],'"\(\)]/g,
            RULE: /^(?:required|optional|repeated)$/,
            TYPE: /^(?:double|float|int32|uint32|sint32|int64|uint64|sint64|fixed32|sfixed32|fixed64|sfixed64|bool|string|bytes)$/,
            NAME: /^[a-zA-Z_][a-zA-Z_0-9]*$/,
            TYPEDEF: /^[a-zA-Z][a-zA-Z_0-9]*$/,
            TYPEREF: /^(?:\.?[a-zA-Z_][a-zA-Z_0-9]*)+$/,
            FQTYPEREF: /^(?:\.[a-zA-Z][a-zA-Z_0-9]*)+$/,
            NUMBER: /^-?(?:[1-9][0-9]*|0|0x[0-9a-fA-F]+|0[0-7]+|([0-9]*\.[0-9]+([Ee][+-]?[0-9]+)?))$/,
            NUMBER_DEC: /^(?:[1-9][0-9]*|0)$/,
            NUMBER_HEX: /^0x[0-9a-fA-F]+$/,
            NUMBER_OCT: /^0[0-7]+$/,
            NUMBER_FLT: /^[0-9]*\.[0-9]+([Ee][+-]?[0-9]+)?$/,
            ID: /^(?:[1-9][0-9]*|0|0x[0-9a-fA-F]+|0[0-7]+)$/,
            NEGID: /^\-?(?:[1-9][0-9]*|0|0x[0-9a-fA-F]+|0[0-7]+)$/,
            WHITESPACE: /\s/,
            STRING: /(?:"([^"\\]*(?:\\.[^"\\]*)*)")|(?:'([^'\\]*(?:\\.[^'\\]*)*)')/g,
            BOOL: /^(?:true|false)$/i
        };
        f.DotProto = function(c, e) {
            var f = {},
                l = function(d) {
                    this.source = "" + d;
                    this.index = 0;
                    this.line = 1;
                    this.stack = [];
                    this.readingString = !1;
                    this.stringEndsWith = e.STRINGCLOSE
                },
                q = l.prototype;
            q._readString = function() {
                e.STRING.lastIndex = this.index - 1;
                var d;
                if (null !== (d = e.STRING.exec(this.source))) return d = "undefined" !== typeof d[1] ? d[1] : d[2], this.index =
                    e.STRING.lastIndex, this.stack.push(this.stringEndsWith), d;
                throw Error("Unterminated string at line " + this.line + ", index " + this.index);
            };
            q.next = function() {
                if (0 < this.stack.length) return this.stack.shift();
                if (this.index >= this.source.length) return null;
                if (this.readingString) return this.readingString = !1, this._readString();
                var d, a;
                do {
                    for (d = !1; e.WHITESPACE.test(a = this.source.charAt(this.index));)
                        if (this.index++, "\n" === a && this.line++, this.index === this.source.length) return null;
                    if ("/" === this.source.charAt(this.index))
                        if ("/" ===
                            this.source.charAt(++this.index)) {
                            for (;
                                "\n" !== this.source.charAt(this.index);)
                                if (this.index++, this.index == this.source.length) return null;
                            this.index++;
                            this.line++;
                            d = !0
                        } else if ("*" === this.source.charAt(this.index)) {
                        for (a = "";
                            "*/" !== a + (a = this.source.charAt(this.index));)
                            if (this.index++, "\n" === a && this.line++, this.index === this.source.length) return null;
                        this.index++;
                        d = !0
                    } else throw Error("Unterminated comment at line " + this.line + ": /" + this.source.charAt(this.index));
                } while (d);
                if (this.index === this.source.length) return null;
                d = this.index;
                e.DELIM.lastIndex = 0;
                if (e.DELIM.test(this.source.charAt(d))) ++d;
                else
                    for (++d; d < this.source.length && !e.DELIM.test(this.source.charAt(d));) d++;
                d = this.source.substring(this.index, this.index = d);
                d === e.STRINGOPEN ? (this.readingString = !0, this.stringEndsWith = e.STRINGCLOSE) : d === e.STRINGOPEN_SQ && (this.readingString = !0, this.stringEndsWith = e.STRINGCLOSE_SQ);
                return d
            };
            q.peek = function() {
                if (0 === this.stack.length) {
                    var d = this.next();
                    if (null === d) return null;
                    this.stack.push(d)
                }
                return this.stack[0]
            };
            q.toString =
                function() {
                    return "Tokenizer(" + this.index + "/" + this.source.length + " at line " + this.line + ")"
                };
            f.Tokenizer = l;
            var q = function(d) {
                    this.tn = new l(d)
                },
                b = q.prototype;
            b.parse = function() {
                for (var d = {
                        name: "[ROOT]",
                        "package": null,
                        messages: [],
                        enums: [],
                        imports: [],
                        options: {},
                        services: []
                    }, a, h = !0; a = this.tn.next();) switch (a) {
                    case "package":
                        if (!h || null !== d["package"]) throw Error("Unexpected package at line " + this.tn.line);
                        d["package"] = this._parsePackage(a);
                        break;
                    case "import":
                        if (!h) throw Error("Unexpected import at line " +
                            this.tn.line);
                        d.imports.push(this._parseImport(a));
                        break;
                    case "message":
                        this._parseMessage(d, null, a);
                        h = !1;
                        break;
                    case "enum":
                        this._parseEnum(d, a);
                        h = !1;
                        break;
                    case "option":
                        this._parseOption(d, a);
                        break;
                    case "service":
                        this._parseService(d, a);
                        break;
                    case "extend":
                        this._parseExtend(d, a);
                        break;
                    case "syntax":
                        this._parseIgnoredStatement(d, a);
                        break;
                    default:
                        throw Error("Unexpected token at line " + this.tn.line + ": " + a);
                }
                delete d.name;
                return d
            };
            b._parseNumber = function(d) {
                var a = 1;
                "-" == d.charAt(0) && (a = -1, d = d.substring(1));
                if (e.NUMBER_DEC.test(d)) return a * parseInt(d, 10);
                if (e.NUMBER_HEX.test(d)) return a * parseInt(d.substring(2), 16);
                if (e.NUMBER_OCT.test(d)) return a * parseInt(d.substring(1), 8);
                if (e.NUMBER_FLT.test(d)) return a * parseFloat(d);
                throw Error("Illegal number at line " + this.tn.line + ": " + (0 > a ? "-" : "") + d);
            };
            b._parseString = function() {
                var d = "",
                    a, h;
                do {
                    h = this.tn.next();
                    d += this.tn.next();
                    a = this.tn.next();
                    if (a !== h) throw Error("Illegal end of string at line " + this.tn.line + ": " + a);
                    a = this.tn.peek()
                } while (a === e.STRINGOPEN || a ===
                    e.STRINGOPEN_SQ);
                return d
            };
            b._parseId = function(d, a) {
                var h = -1,
                    b = 1;
                "-" == d.charAt(0) && (b = -1, d = d.substring(1));
                if (e.NUMBER_DEC.test(d)) h = parseInt(d);
                else if (e.NUMBER_HEX.test(d)) h = parseInt(d.substring(2), 16);
                else if (e.NUMBER_OCT.test(d)) h = parseInt(d.substring(1), 8);
                else throw Error("Illegal id at line " + this.tn.line + ": " + (0 > b ? "-" : "") + d);
                h = b * h | 0;
                if (!a && 0 > h) throw Error("Illegal id at line " + this.tn.line + ": " + (0 > b ? "-" : "") + d);
                return h
            };
            b._parsePackage = function(d) {
                d = this.tn.next();
                if (!e.TYPEREF.test(d)) throw Error("Illegal package name at line " +
                    this.tn.line + ": " + d);
                var a = d;
                d = this.tn.next();
                if (d != e.END) throw Error("Illegal end of package at line " + this.tn.line + ": " + d);
                return a
            };
            b._parseImport = function(d) {
                d = this.tn.peek();
                "public" === d && (this.tn.next(), d = this.tn.peek());
                if (d !== e.STRINGOPEN && d !== e.STRINGOPEN_SQ) throw Error("Illegal start of import at line " + this.tn.line + ": " + d);
                var a = this._parseString();
                d = this.tn.next();
                if (d !== e.END) throw Error("Illegal end of import at line " + this.tn.line + ": " + d);
                return a
            };
            b._parseOption = function(d, a) {
                a = this.tn.next();
                var h = !1;
                a == e.COPTOPEN && (h = !0, a = this.tn.next());
                if (!e.TYPEREF.test(a) && !/google\.protobuf\./.test(a)) throw Error("Illegal option name in message " + d.name + " at line " + this.tn.line + ": " + a);
                var b = a;
                a = this.tn.next();
                if (h) {
                    if (a !== e.COPTCLOSE) throw Error("Illegal end in message " + d.name + ", option " + b + " at line " + this.tn.line + ": " + a);
                    b = "(" + b + ")";
                    a = this.tn.next();
                    e.FQTYPEREF.test(a) && (b += a, a = this.tn.next())
                }
                if (a !== e.EQUAL) throw Error("Illegal operator in message " + d.name + ", option " + b + " at line " + this.tn.line +
                    ": " + a);
                a = this.tn.peek();
                if (a === e.STRINGOPEN || a === e.STRINGOPEN_SQ) h = this._parseString();
                else if (this.tn.next(), e.NUMBER.test(a)) h = this._parseNumber(a, !0);
                else if (e.BOOL.test(a)) h = "true" === a;
                else if (e.TYPEREF.test(a)) h = a;
                else throw Error("Illegal option value in message " + d.name + ", option " + b + " at line " + this.tn.line + ": " + a);
                a = this.tn.next();
                if (a !== e.END) throw Error("Illegal end of option in message " + d.name + ", option " + b + " at line " + this.tn.line + ": " + a);
                d.options[b] = h
            };
            b._parseIgnoredStatement = function(d,
                a) {
                var h;
                do {
                    h = this.tn.next();
                    if (null === h) throw Error("Unexpected EOF in " + d.name + ", " + a + " at line " + this.tn.line);
                    if (h === e.END) break
                } while (1)
            };
            b._parseService = function(d, a) {
                a = this.tn.next();
                if (!e.NAME.test(a)) throw Error("Illegal service name at line " + this.tn.line + ": " + a);
                var h = a,
                    b = {
                        name: h,
                        rpc: {},
                        options: {}
                    };
                a = this.tn.next();
                if (a !== e.OPEN) throw Error("Illegal start of service " + h + " at line " + this.tn.line + ": " + a);
                do
                    if (a = this.tn.next(), "option" === a) this._parseOption(b, a);
                    else if ("rpc" === a) this._parseServiceRPC(b,
                    a);
                else if (a !== e.CLOSE) throw Error("Illegal type of service " + h + " at line " + this.tn.line + ": " + a);
                while (a !== e.CLOSE);
                d.services.push(b)
            };
            b._parseServiceRPC = function(d, a) {
                var b = a;
                a = this.tn.next();
                if (!e.NAME.test(a)) throw Error("Illegal method name in service " + d.name + " at line " + this.tn.line + ": " + a);
                var c = a,
                    f = {
                        request: null,
                        response: null,
                        options: {}
                    };
                a = this.tn.next();
                if (a !== e.COPTOPEN) throw Error("Illegal start of request type in service " + d.name + "#" + c + " at line " + this.tn.line + ": " + a);
                a = this.tn.next();
                if (!e.TYPEREF.test(a)) throw Error("Illegal request type in service " + d.name + "#" + c + " at line " + this.tn.line + ": " + a);
                f.request = a;
                a = this.tn.next();
                if (a != e.COPTCLOSE) throw Error("Illegal end of request type in service " + d.name + "#" + c + " at line " + this.tn.line + ": " + a);
                a = this.tn.next();
                if ("returns" !== a.toLowerCase()) throw Error("Illegal delimiter in service " + d.name + "#" + c + " at line " + this.tn.line + ": " + a);
                a = this.tn.next();
                if (a != e.COPTOPEN) throw Error("Illegal start of response type in service " + d.name + "#" +
                    c + " at line " + this.tn.line + ": " + a);
                a = this.tn.next();
                f.response = a;
                a = this.tn.next();
                if (a !== e.COPTCLOSE) throw Error("Illegal end of response type in service " + d.name + "#" + c + " at line " + this.tn.line + ": " + a);
                a = this.tn.next();
                if (a === e.OPEN) {
                    do
                        if (a = this.tn.next(), "option" === a) this._parseOption(f, a);
                        else if (a !== e.CLOSE) throw Error("Illegal start of option inservice " + d.name + "#" + c + " at line " + this.tn.line + ": " + a); while (a !== e.CLOSE);
                    this.tn.peek() === e.END && this.tn.next()
                } else if (a !== e.END) throw Error("Illegal delimiter in service " +
                    d.name + "#" + c + " at line " + this.tn.line + ": " + a);
                "undefined" === typeof d[b] && (d[b] = {});
                d[b][c] = f
            };
            b._parseMessage = function(d, a, b) {
                var c = {},
                    f = "group" === b;
                b = this.tn.next();
                if (!e.NAME.test(b)) throw Error("Illegal " + (f ? "group" : "message") + " name" + (d ? " in message " + d.name : "") + " at line " + this.tn.line + ": " + b);
                c.name = b;
                if (f) {
                    b = this.tn.next();
                    if (b !== e.EQUAL) throw Error("Illegal id assignment after group " + c.name + " at line " + this.tn.line + ": " + b);
                    b = this.tn.next();
                    try {
                        a.id = this._parseId(b)
                    } catch (g) {
                        throw Error("Illegal field id value for group " +
                            c.name + "#" + a.name + " at line " + this.tn.line + ": " + b);
                    }
                    c.isGroup = !0
                }
                c.fields = [];
                c.enums = [];
                c.messages = [];
                c.options = {};
                c.oneofs = {};
                b = this.tn.next();
                b === e.OPTOPEN && a && (this._parseFieldOptions(c, a, b), b = this.tn.next());
                if (b !== e.OPEN) throw Error("Illegal start of " + (f ? "group" : "message") + " " + c.name + " at line " + this.tn.line + ": " + b);
                do
                    if (b = this.tn.next(), b === e.CLOSE) {
                        b = this.tn.peek();
                        b === e.END && this.tn.next();
                        break
                    } else if (e.RULE.test(b)) this._parseMessageField(c, b);
                else if ("oneof" === b) this._parseMessageOneOf(c,
                    b);
                else if ("enum" === b) this._parseEnum(c, b);
                else if ("message" === b) this._parseMessage(c, null, b);
                else if ("option" === b) this._parseOption(c, b);
                else if ("extensions" === b) c.extensions = this._parseExtensions(c, b);
                else if ("extend" === b) this._parseExtend(c, b);
                else throw Error("Illegal token in message " + c.name + " at line " + this.tn.line + ": " + b);
                while (1);
                d.messages.push(c);
                return c
            };
            b._parseMessageField = function(b, a) {
                var c = {},
                    f = null;
                c.rule = a;
                c.options = {};
                a = this.tn.next();
                if ("group" === a) {
                    f = this._parseMessage(b, c,
                        a);
                    if (!/^[A-Z]/.test(f.name)) throw Error("Group names must start with a capital letter");
                    c.type = f.name;
                    c.name = f.name.toLowerCase();
                    a = this.tn.peek();
                    a === e.END && this.tn.next()
                } else {
                    if (!e.TYPE.test(a) && !e.TYPEREF.test(a)) throw Error("Illegal field type in message " + b.name + " at line " + this.tn.line + ": " + a);
                    c.type = a;
                    a = this.tn.next();
                    if (!e.NAME.test(a)) throw Error("Illegal field name in message " + b.name + " at line " + this.tn.line + ": " + a);
                    c.name = a;
                    a = this.tn.next();
                    if (a !== e.EQUAL) throw Error("Illegal token in field " +
                        b.name + "#" + c.name + " at line " + this.tn.line + ": " + a);
                    a = this.tn.next();
                    try {
                        c.id = this._parseId(a)
                    } catch (k) {
                        throw Error("Illegal field id in message " + b.name + "#" + c.name + " at line " + this.tn.line + ": " + a);
                    }
                    a = this.tn.next();
                    a === e.OPTOPEN && (this._parseFieldOptions(b, c, a), a = this.tn.next());
                    if (a !== e.END) throw Error("Illegal delimiter in message " + b.name + "#" + c.name + " at line " + this.tn.line + ": " + a);
                }
                b.fields.push(c);
                return c
            };
            b._parseMessageOneOf = function(b, a) {
                a = this.tn.next();
                if (!e.NAME.test(a)) throw Error("Illegal oneof name in message " +
                    b.name + " at line " + this.tn.line + ": " + a);
                var c = a,
                    f, k = [];
                a = this.tn.next();
                if (a !== e.OPEN) throw Error("Illegal start of oneof " + c + " at line " + this.tn.line + ": " + a);
                for (; this.tn.peek() !== e.CLOSE;) f = this._parseMessageField(b, "optional"), f.oneof = c, k.push(f.id);
                this.tn.next();
                b.oneofs[c] = k
            };
            b._parseFieldOptions = function(b, a, c) {
                var f = !0;
                do {
                    c = this.tn.next();
                    if (c === e.OPTCLOSE) break;
                    else if (c === e.OPTEND) {
                        if (f) throw Error("Illegal start of options in message " + b.name + "#" + a.name + " at line " + this.tn.line + ": " + c);
                        c = this.tn.next()
                    }
                    this._parseFieldOption(b, a, c);
                    f = !1
                } while (1)
            };
            b._parseFieldOption = function(b, a, c) {
                var f = !1;
                c === e.COPTOPEN && (c = this.tn.next(), f = !0);
                if (!e.TYPEREF.test(c)) throw Error("Illegal field option in " + b.name + "#" + a.name + " at line " + this.tn.line + ": " + c);
                var k = c;
                c = this.tn.next();
                if (f) {
                    if (c !== e.COPTCLOSE) throw Error("Illegal delimiter in " + b.name + "#" + a.name + " at line " + this.tn.line + ": " + c);
                    k = "(" + k + ")";
                    c = this.tn.next();
                    e.FQTYPEREF.test(c) && (k += c, c = this.tn.next())
                }
                if (c !== e.EQUAL) throw Error("Illegal token in " +
                    b.name + "#" + a.name + " at line " + this.tn.line + ": " + c);
                c = this.tn.peek();
                if (c === e.STRINGOPEN || c === e.STRINGOPEN_SQ) b = this._parseString();
                else if (e.NUMBER.test(c, !0)) b = this._parseNumber(this.tn.next(), !0);
                else if (e.BOOL.test(c)) b = "true" === this.tn.next().toLowerCase();
                else if (e.TYPEREF.test(c)) b = this.tn.next();
                else throw Error("Illegal value in message " + b.name + "#" + a.name + ", option " + k + " at line " + this.tn.line + ": " + c);
                a.options[k] = b
            };
            b._parseEnum = function(b, a) {
                var c = {};
                a = this.tn.next();
                if (!e.NAME.test(a)) throw Error("Illegal enum name in message " +
                    b.name + " at line " + this.tn.line + ": " + a);
                c.name = a;
                a = this.tn.next();
                if (a !== e.OPEN) throw Error("Illegal start of enum " + c.name + " at line " + this.tn.line + ": " + a);
                c.values = [];
                c.options = {};
                do {
                    a = this.tn.next();
                    if (a === e.CLOSE) {
                        a = this.tn.peek();
                        a === e.END && this.tn.next();
                        break
                    }
                    if ("option" == a) this._parseOption(c, a);
                    else {
                        if (!e.NAME.test(a)) throw Error("Illegal name in enum " + c.name + " at line " + this.tn.line + ": " + a);
                        this._parseEnumValue(c, a)
                    }
                } while (1);
                b.enums.push(c)
            };
            b._parseEnumValue = function(b, a) {
                var c = {};
                c.name =
                    a;
                a = this.tn.next();
                if (a !== e.EQUAL) throw Error("Illegal token in enum " + b.name + " at line " + this.tn.line + ": " + a);
                a = this.tn.next();
                try {
                    c.id = this._parseId(a, !0)
                } catch (f) {
                    throw Error("Illegal id in enum " + b.name + " at line " + this.tn.line + ": " + a);
                }
                b.values.push(c);
                a = this.tn.next();
                a === e.OPTOPEN && (this._parseFieldOptions(b, {
                    options: {}
                }, a), a = this.tn.next());
                if (a !== e.END) throw Error("Illegal delimiter in enum " + b.name + " at line " + this.tn.line + ": " + a);
            };
            b._parseExtensions = function(b, a) {
                var h = [];
                a = this.tn.next();
                "min" === a ? h.push(c.ID_MIN) : "max" === a ? h.push(c.ID_MAX) : h.push(this._parseNumber(a));
                a = this.tn.next();
                if ("to" !== a) throw Error("Illegal extensions delimiter in message " + b.name + " at line " + this.tn.line + ": " + a);
                a = this.tn.next();
                "min" === a ? h.push(c.ID_MIN) : "max" === a ? h.push(c.ID_MAX) : h.push(this._parseNumber(a));
                a = this.tn.next();
                if (a !== e.END) throw Error("Illegal extensions delimiter in message " + b.name + " at line " + this.tn.line + ": " + a);
                return h
            };
            b._parseExtend = function(b, a) {
                a = this.tn.next();
                if (!e.TYPEREF.test(a)) throw Error("Illegal message name at line " +
                    this.tn.line + ": " + a);
                var c = {};
                c.ref = a;
                c.fields = [];
                a = this.tn.next();
                if (a !== e.OPEN) throw Error("Illegal start of extend " + c.name + " at line " + this.tn.line + ": " + a);
                do
                    if (a = this.tn.next(), a === e.CLOSE) {
                        a = this.tn.peek();
                        a == e.END && this.tn.next();
                        break
                    } else if (e.RULE.test(a)) this._parseMessageField(c, a);
                else throw Error("Illegal token in extend " + c.name + " at line " + this.tn.line + ": " + a);
                while (1);
                b.messages.push(c);
                return c
            };
            b.toString = function() {
                return "Parser"
            };
            f.Parser = q;
            return f
        }(f, f.Lang);
        f.Reflect = function(c) {
            function e(a,
                b) {
                var d = b.readVarint32(),
                    f = d & 7,
                    d = d >> 3;
                switch (f) {
                    case c.WIRE_TYPES.VARINT:
                        do d = b.readUint8(); while (128 === (d & 128));
                        break;
                    case c.WIRE_TYPES.BITS64:
                        b.offset += 8;
                        break;
                    case c.WIRE_TYPES.LDELIM:
                        d = b.readVarint32();
                        b.offset += d;
                        break;
                    case c.WIRE_TYPES.STARTGROUP:
                        e(d, b);
                        break;
                    case c.WIRE_TYPES.ENDGROUP:
                        if (d === a) return !1;
                        throw Error("Illegal GROUPEND after unknown group: " + d + " (" + a + " expected)");
                    case c.WIRE_TYPES.BITS32:
                        b.offset += 4;
                        break;
                    default:
                        throw Error("Illegal wire type in unknown group " + a + ": " + f);
                }
                return !0
            }

            function f(a, b) {
                if (a && "number" === typeof a.low && "number" === typeof a.high && "boolean" === typeof a.unsigned && a.low === a.low && a.high === a.high) return new c.Long(a.low, a.high, "undefined" === typeof b ? a.unsigned : b);
                if ("string" === typeof a) return c.Long.fromString(a, b || !1, 10);
                if ("number" === typeof a) return c.Long.fromNumber(a, b || !1);
                throw Error("not convertible to Long");
            }
            var l = {},
                q = function(a, b, c) {
                    this.builder = a;
                    this.parent = b;
                    this.name = c
                },
                b = q.prototype;
            b.fqn = function() {
                var a = this.name,
                    b = this;
                do {
                    b = b.parent;
                    if (null ==
                        b) break;
                    a = b.name + "." + a
                } while (1);
                return a
            };
            b.toString = function(a) {
                return (a ? this.className + " " : "") + this.fqn()
            };
            b.build = function() {
                throw Error(this.toString(!0) + " cannot be built directly");
            };
            l.T = q;
            var d = function(a, b, c, d) {
                    q.call(this, a, b, c);
                    this.className = "Namespace";
                    this.children = [];
                    this.options = d || {}
                },
                b = d.prototype = Object.create(q.prototype);
            b.getChildren = function(a) {
                a = a || null;
                if (null == a) return this.children.slice();
                for (var b = [], c = 0, d = this.children.length; c < d; ++c) this.children[c] instanceof a && b.push(this.children[c]);
                return b
            };
            b.addChild = function(b) {
                var c;
                if (c = this.getChild(b.name))
                    if (c instanceof a.Field && c.name !== c.originalName && null === this.getChild(c.originalName)) c.name = c.originalName;
                    else if (b instanceof a.Field && b.name !== b.originalName && null === this.getChild(b.originalName)) b.name = b.originalName;
                else throw Error("Duplicate name in namespace " + this.toString(!0) + ": " + b.name);
                this.children.push(b)
            };
            b.getChild = function(a) {
                for (var b = "number" === typeof a ? "id" : "name", c = 0, d = this.children.length; c < d; ++c)
                    if (this.children[c][b] ===
                        a) return this.children[c];
                return null
            };
            b.resolve = function(a, b) {
                var c = "string" === typeof a ? a.split(".") : a,
                    d = this,
                    e = 0;
                if ("" === c[e]) {
                    for (; null !== d.parent;) d = d.parent;
                    e++
                }
                do {
                    do {
                        d = d.getChild(c[e]);
                        if (!(d && d instanceof l.T) || b && d instanceof l.Message.Field) {
                            d = null;
                            break
                        }
                        e++
                    } while (e < c.length);
                    if (null != d) break;
                    if (null !== this.parent) return this.parent.resolve(a, b)
                } while (null != d);
                return d
            };
            b.qn = function(a) {
                var b = [],
                    c = a;
                do b.unshift(c.name), c = c.parent; while (null !== c);
                for (c = 1; c <= b.length; c++) {
                    var d = b.slice(b.length -
                        c);
                    if (a === this.resolve(d)) return d.join(".")
                }
                return a.fqn()
            };
            b.build = function() {
                for (var a = {}, b = this.children, c = 0, e = b.length, f; c < e; ++c) f = b[c], f instanceof d && (a[f.name] = f.build());
                Object.defineProperty && Object.defineProperty(a, "$options", {
                    value: this.buildOpt()
                });
                return a
            };
            b.buildOpt = function() {
                for (var a = {}, b = Object.keys(this.options), c = 0, d = b.length; c < d; ++c) a[b[c]] = this.options[b[c]];
                return a
            };
            b.getOption = function(a) {
                return "undefined" === typeof a ? this.options : "undefined" !== typeof this.options[a] ? this.options[a] :
                    null
            };
            l.Namespace = d;
            var a = function(a, b, e, f, h) {
                    d.call(this, a, b, e, f);
                    this.className = "Message";
                    this.extensions = [c.ID_MIN, c.ID_MAX];
                    this.clazz = null;
                    this.isGroup = !!h;
                    this._fieldsByName = this._fieldsById = this._fields = null
                },
                h = a.prototype = Object.create(d.prototype);
            h.build = function(b) {
                if (this.clazz && !b) return this.clazz;
                b = function(a, b) {
                    function c(a, b) {
                        var d = {},
                            m;
                        for (m in a) a.hasOwnProperty(m) && (null === a[m] || "object" !== typeof a[m] ? d[m] = a[m] : a[m] instanceof n ? b && (d[m] = a[m].toBase64()) : d[m] = c(a[m], b));
                        return d
                    }
                    var d = b.getChildren(a.Reflect.Message.Field),
                        m = b.getChildren(a.Reflect.Message.OneOf),
                        e = function(b, c) {
                            a.Builder.Message.call(this);
                            for (var e = 0, p = m.length; e < p; ++e) this[m[e].name] = null;
                            e = 0;
                            for (p = d.length; e < p; ++e) {
                                var f = d[e];
                                this[f.name] = f.repeated ? [] : null;
                                f.required && null !== f.defaultValue && (this[f.name] = f.defaultValue)
                            }
                            if (0 < arguments.length)
                                if (1 !== arguments.length || "object" !== typeof b || "function" === typeof b.encode || a.Util.isArray(b) || b instanceof n || b instanceof ArrayBuffer || a.Long && b instanceof a.Long)
                                    for (e =
                                        0, p = arguments.length; e < p; ++e) "undefined" !== typeof(f = arguments[e]) && this.$set(d[e].name, f);
                                else this.$set(b)
                        },
                        p = e.prototype = Object.create(a.Builder.Message.prototype);
                    p.add = function(c, d, m) {
                        var e = b._fieldsByName[c];
                        if (!m) {
                            if (!e) throw Error(this + "#" + c + " is undefined");
                            if (!(e instanceof a.Reflect.Message.Field)) throw Error(this + "#" + c + " is not a field: " + e.toString(!0));
                            if (!e.repeated) throw Error(this + "#" + c + " is not a repeated field");
                        }
                        null === this[e.name] && (this[e.name] = []);
                        this[e.name].push(m ? d : e.verifyValue(d, !0))
                    };
                    p.$add = p.add;
                    p.set = function(c, d, m) {
                        if (c && "object" === typeof c) {
                            m = d;
                            for (var e in c) c.hasOwnProperty(e) && "undefined" !== typeof(d = c[e]) && this.$set(e, d, m);
                            return this
                        }
                        e = b._fieldsByName[c];
                        if (m) this[e.name] = d;
                        else {
                            if (!e) throw Error(this + "#" + c + " is not a field: undefined");
                            if (!(e instanceof a.Reflect.Message.Field)) throw Error(this + "#" + c + " is not a field: " + e.toString(!0));
                            this[e.name] = d = e.verifyValue(d)
                        }
                        e.oneof && (null !== d ? (null !== this[e.oneof.name] && (this[this[e.oneof.name]] = null), this[e.oneof.name] =
                            e.name) : e.oneof.name === c && (this[e.oneof.name] = null));
                        return this
                    };
                    p.$set = p.set;
                    p.get = function(c, d) {
                        if (d) return this[c];
                        var m = b._fieldsByName[c];
                        if (!(m && m instanceof a.Reflect.Message.Field)) throw Error(this + "#" + c + " is not a field: undefined");
                        if (!(m instanceof a.Reflect.Message.Field)) throw Error(this + "#" + c + " is not a field: " + m.toString(!0));
                        return this[m.name]
                    };
                    p.$get = p.get;
                    for (var f = 0; f < d.length; f++) {
                        var h = d[f];
                        h instanceof a.Reflect.Message.ExtensionField || b.builder.options.populateAccessors &&
                            function(a) {
                                var c = a.originalName.replace(/(_[a-zA-Z])/g, function(a) {
                                        return a.toUpperCase().replace("_", "")
                                    }),
                                    c = c.substring(0, 1).toUpperCase() + c.substring(1),
                                    d = a.originalName.replace(/([A-Z])/g, function(a) {
                                        return "_" + a
                                    }),
                                    m = function(b, c) {
                                        this[a.name] = c ? b : a.verifyValue(b);
                                        return this
                                    },
                                    e = function() {
                                        return this[a.name]
                                    };
                                null === b.getChild("set" + c) && (p["set" + c] = m);
                                null === b.getChild("set_" + d) && (p["set_" + d] = m);
                                null === b.getChild("get" + c) && (p["get" + c] = e);
                                null === b.getChild("get_" + d) && (p["get_" + d] = e)
                            }(h)
                    }
                    p.encode =
                        function(a, c) {
                            "boolean" === typeof a && (c = a, a = void 0);
                            var d = !1;
                            a || (a = new n, d = !0);
                            var m = a.littleEndian;
                            try {
                                return b.encode(this, a.LE(), c), (d ? a.flip() : a).LE(m)
                            } catch (e) {
                                throw a.LE(m), e;
                            }
                        };
                    p.calculate = function() {
                        return b.calculate(this)
                    };
                    p.encodeDelimited = function(a) {
                        var c = !1;
                        a || (a = new n, c = !0);
                        var d = (new n).LE();
                        b.encode(this, d).flip();
                        a.writeVarint32(d.remaining());
                        a.append(d);
                        return c ? a.flip() : a
                    };
                    p.encodeAB = function() {
                        try {
                            return this.encode().toArrayBuffer()
                        } catch (a) {
                            throw a.encoded && (a.encoded = a.encoded.toArrayBuffer()),
                                a;
                        }
                    };
                    p.toArrayBuffer = p.encodeAB;
                    p.encodeNB = function() {
                        try {
                            return this.encode().toBuffer()
                        } catch (a) {
                            throw a.encoded && (a.encoded = a.encoded.toBuffer()), a;
                        }
                    };
                    p.toBuffer = p.encodeNB;
                    p.encode64 = function() {
                        try {
                            return this.encode().toBase64()
                        } catch (a) {
                            throw a.encoded && (a.encoded = a.encoded.toBase64()), a;
                        }
                    };
                    p.toBase64 = p.encode64;
                    p.encodeHex = function() {
                        try {
                            return this.encode().toHex()
                        } catch (a) {
                            throw a.encoded && (a.encoded = a.encoded.toHex()), a;
                        }
                    };
                    p.toHex = p.encodeHex;
                    p.toRaw = function(a) {
                        return c(this, !!a)
                    };
                    e.decode =
                        function(a, c) {
                            "string" === typeof a && (a = n.wrap(a, c ? c : "base64"));
                            a = a instanceof n ? a : n.wrap(a);
                            var d = a.littleEndian;
                            try {
                                var m = b.decode(a.LE());
                                a.LE(d);
                                return m
                            } catch (e) {
                                throw a.LE(d), e;
                            }
                        };
                    e.decodeDelimited = function(a, c) {
                        "string" === typeof a && (a = n.wrap(a, c ? c : "base64"));
                        a = a instanceof n ? a : n.wrap(a);
                        if (1 > a.remaining()) return null;
                        var d = a.offset,
                            m = a.readVarint32();
                        if (a.remaining() < m) return a.offset = d, null;
                        try {
                            var e = b.decode(a.slice(a.offset, a.offset + m).LE());
                            a.offset += m;
                            return e
                        } catch (p) {
                            throw a.offset += m,
                                p;
                        }
                    };
                    e.decode64 = function(a) {
                        return e.decode(a, "base64")
                    };
                    e.decodeHex = function(a) {
                        return e.decode(a, "hex")
                    };
                    p.toString = function() {
                        return b.toString()
                    };
                    Object.defineProperty && (Object.defineProperty(e, "$options", {
                        value: b.buildOpt()
                    }), Object.defineProperty(p, "$options", {
                        value: e.$options
                    }), Object.defineProperty(e, "$type", {
                        value: b
                    }), Object.defineProperty(p, "$type", {
                        value: b
                    }));
                    return e
                }(c, this);
                this._fields = [];
                this._fieldsById = {};
                this._fieldsByName = {};
                for (var d = 0, e = this.children.length, f; d < e; d++)
                    if (f = this.children[d],
                        f instanceof k) b[f.name] = f.build();
                    else if (f instanceof a) b[f.name] = f.build();
                else if (f instanceof a.Field) f.build(), this._fields.push(f), this._fieldsById[f.id] = f, this._fieldsByName[f.name] = f;
                else if (!(f instanceof a.OneOf || f instanceof g)) throw Error("Illegal reflect child of " + this.toString(!0) + ": " + children[d].toString(!0));
                return this.clazz = b
            };
            h.encode = function(a, b, c) {
                for (var d = null, e, f = 0, h = this._fields.length, g; f < h; ++f) e = this._fields[f], g = a[e.name], e.required && null === g ? null === d && (d = e) : e.encode(c ?
                    g : e.verifyValue(g), b);
                if (null !== d) throw a = Error("Missing at least one required field for " + this.toString(!0) + ": " + d), a.encoded = b, a;
                return b
            };
            h.calculate = function(a) {
                for (var b = 0, c = 0, d = this._fields.length, e, f; c < d; ++c) {
                    e = this._fields[c];
                    f = a[e.name];
                    if (e.required && null === f) throw Error("Missing at least one required field for " + this.toString(!0) + ": " + e);
                    b += e.calculate(f)
                }
                return b
            };
            h.decode = function(a, b, d) {
                b = "number" === typeof b ? b : -1;
                for (var f = a.offset, h = new this.clazz, g, k, l; a.offset < f + b || -1 === b && 0 < a.remaining();) {
                    g =
                        a.readVarint32();
                    k = g & 7;
                    l = g >> 3;
                    if (k === c.WIRE_TYPES.ENDGROUP) {
                        if (l !== d) throw Error("Illegal group end indicator for " + this.toString(!0) + ": " + l + " (" + (d ? d + " expected" : "not a group") + ")");
                        break
                    }
                    if (g = this._fieldsById[l]) g.repeated && !g.options.packed ? h[g.name].push(g.decode(k, a)) : (h[g.name] = g.decode(k, a), g.oneof && (null !== this[g.oneof.name] && (this[this[g.oneof.name]] = null), h[g.oneof.name] = g.name));
                    else switch (k) {
                        case c.WIRE_TYPES.VARINT:
                            a.readVarint32();
                            break;
                        case c.WIRE_TYPES.BITS32:
                            a.offset += 4;
                            break;
                        case c.WIRE_TYPES.BITS64:
                            a.offset +=
                                8;
                            break;
                        case c.WIRE_TYPES.LDELIM:
                            g = a.readVarint32();
                            a.offset += g;
                            break;
                        case c.WIRE_TYPES.STARTGROUP:
                            for (; e(l, a););
                            break;
                        default:
                            throw Error("Illegal wire type for unknown field " + l + " in " + this.toString(!0) + "#decode: " + k);
                    }
                }
                a = 0;
                for (b = this._fields.length; a < b; ++a)
                    if (g = this._fields[a], null === h[g.name]) {
                        if (g.required) throw a = Error("Missing at least one required field for " + this.toString(!0) + ": " + g.name), a.decoded = h, a;
                        null !== g.defaultValue && (h[g.name] = g.defaultValue)
                    }
                return h
            };
            l.Message = a;
            var r = function(b,
                c, d, e, f, h, g, k) {
                q.call(this, b, c, f);
                this.className = "Message.Field";
                this.required = "required" === d;
                this.repeated = "repeated" === d;
                this.type = e;
                this.resolvedType = null;
                this.id = h;
                this.options = g || {};
                this.defaultValue = null;
                this.oneof = k || null;
                this.originalName = this.name;
                !this.builder.options.convertFieldsToCamelCase || this instanceof a.ExtensionField || (this.name = r._toCamelCase(this.name))
            };
            r._toCamelCase = function(a) {
                return a.replace(/_([a-zA-Z])/g, function(a, b) {
                    return b.toUpperCase()
                })
            };
            h = r.prototype = Object.create(q.prototype);
            h.build = function() {
                this.defaultValue = "undefined" !== typeof this.options["default"] ? this.verifyValue(this.options["default"]) : null
            };
            h.verifyValue = function(a, b) {
                b = b || !1;
                var d = function(a, b) {
                    throw Error("Illegal value for " + this.toString(!0) + " of type " + this.type.name + ": " + a + " (" + b + ")");
                }.bind(this);
                if (null === a) return this.required && d(typeof a, "required"), null;
                var e;
                if (this.repeated && !b) {
                    c.Util.isArray(a) || (a = [a]);
                    d = [];
                    for (e = 0; e < a.length; e++) d.push(this.verifyValue(a[e], !0));
                    return d
                }!this.repeated && c.Util.isArray(a) &&
                    d(typeof a, "no array expected");
                switch (this.type) {
                    case c.TYPES.int32:
                    case c.TYPES.sint32:
                    case c.TYPES.sfixed32:
                        return ("number" !== typeof a || a === a && 0 !== a % 1) && d(typeof a, "not an integer"), 4294967295 < a ? a | 0 : a;
                    case c.TYPES.uint32:
                    case c.TYPES.fixed32:
                        return ("number" !== typeof a || a === a && 0 !== a % 1) && d(typeof a, "not an integer"), 0 > a ? a >>> 0 : a;
                    case c.TYPES.int64:
                    case c.TYPES.sint64:
                    case c.TYPES.sfixed64:
                        if (c.Long) try {
                            return f(a, !1)
                        } catch (h) {
                            d(typeof a, h.message)
                        } else d(typeof a, "requires Long.js");
                    case c.TYPES.uint64:
                    case c.TYPES.fixed64:
                        if (c.Long) try {
                            return f(a, !0)
                        } catch (g) {
                            d(typeof a, g.message)
                        } else d(typeof a, "requires Long.js");
                    case c.TYPES.bool:
                        return "boolean" !== typeof a && d(typeof a, "not a boolean"), a;
                    case c.TYPES["float"]:
                    case c.TYPES["double"]:
                        return "number" !== typeof a && d(typeof a, "not a number"), a;
                    case c.TYPES.string:
                        return "string" === typeof a || a && a instanceof String || d(typeof a, "not a string"), "" + a;
                    case c.TYPES.bytes:
                        return n.isByteBuffer(a) ? a : n.wrap(a, "base64");
                    case c.TYPES["enum"]:
                        var l = this.resolvedType.getChildren(k.Value);
                        for (e = 0; e < l.length; e++)
                            if (l[e].name ==
                                a || l[e].id == a) return l[e].id;
                        d(a, "not a valid enum value");
                    case c.TYPES.group:
                    case c.TYPES.message:
                        a && "object" === typeof a || d(typeof a, "object expected");
                        if (a instanceof this.resolvedType.clazz) return a;
                        if (a instanceof c.Builder.Message) {
                            d = {};
                            for (e in a) a.hasOwnProperty(e) && (d[e] = a[e]);
                            a = d
                        }
                        return new this.resolvedType.clazz(a)
                }
                throw Error("[INTERNAL] Illegal value for " + this.toString(!0) + ": " + a + " (undefined type " + this.type + ")");
            };
            h.encode = function(a, b) {
                if (null === this.type || "object" !== typeof this.type) throw Error("[INTERNAL] Unresolved type in " +
                    this.toString(!0) + ": " + this.type);
                if (null === a || this.repeated && 0 == a.length) return b;
                try {
                    if (this.repeated) {
                        var d;
                        if (this.options.packed && 0 <= c.PACKABLE_WIRE_TYPES.indexOf(this.type.wireType)) {
                            b.writeVarint32(this.id << 3 | c.WIRE_TYPES.LDELIM);
                            b.ensureCapacity(b.offset += 1);
                            var e = b.offset;
                            for (d = 0; d < a.length; d++) this.encodeValue(a[d], b);
                            var f = b.offset - e,
                                h = n.calculateVarint32(f);
                            if (1 < h) {
                                var g = b.slice(e, b.offset),
                                    e = e + (h - 1);
                                b.offset = e;
                                b.append(g)
                            }
                            b.writeVarint32(f, e - h)
                        } else
                            for (d = 0; d < a.length; d++) b.writeVarint32(this.id <<
                                3 | this.type.wireType), this.encodeValue(a[d], b)
                    } else b.writeVarint32(this.id << 3 | this.type.wireType), this.encodeValue(a, b)
                } catch (k) {
                    throw Error("Illegal value for " + this.toString(!0) + ": " + a + " (" + k + ")");
                }
                return b
            };
            h.encodeValue = function(a, b) {
                if (null === a) return b;
                switch (this.type) {
                    case c.TYPES.int32:
                        0 > a ? b.writeVarint64(a) : b.writeVarint32(a);
                        break;
                    case c.TYPES.uint32:
                        b.writeVarint32(a);
                        break;
                    case c.TYPES.sint32:
                        b.writeVarint32ZigZag(a);
                        break;
                    case c.TYPES.fixed32:
                        b.writeUint32(a);
                        break;
                    case c.TYPES.sfixed32:
                        b.writeInt32(a);
                        break;
                    case c.TYPES.int64:
                    case c.TYPES.uint64:
                        b.writeVarint64(a);
                        break;
                    case c.TYPES.sint64:
                        b.writeVarint64ZigZag(a);
                        break;
                    case c.TYPES.fixed64:
                        b.writeUint64(a);
                        break;
                    case c.TYPES.sfixed64:
                        b.writeInt64(a);
                        break;
                    case c.TYPES.bool:
                        "string" === typeof a ? b.writeVarint32("false" === a.toLowerCase() ? 0 : !!a) : b.writeVarint32(a ? 1 : 0);
                        break;
                    case c.TYPES["enum"]:
                        b.writeVarint32(a);
                        break;
                    case c.TYPES["float"]:
                        b.writeFloat32(a);
                        break;
                    case c.TYPES["double"]:
                        b.writeFloat64(a);
                        break;
                    case c.TYPES.string:
                        b.writeVString(a);
                        break;
                    case c.TYPES.bytes:
                        if (0 > a.remaining()) throw Error("Illegal value for " + this.toString(!0) + ": " + a.remaining() + " bytes remaining");
                        var d = a.offset;
                        b.writeVarint32(a.remaining());
                        b.append(a);
                        a.offset = d;
                        break;
                    case c.TYPES.message:
                        d = (new n).LE();
                        this.resolvedType.encode(a, d);
                        b.writeVarint32(d.offset);
                        b.append(d.flip());
                        break;
                    case c.TYPES.group:
                        this.resolvedType.encode(a, b);
                        b.writeVarint32(this.id << 3 | c.WIRE_TYPES.ENDGROUP);
                        break;
                    default:
                        throw Error("[INTERNAL] Illegal value to encode in " + this.toString(!0) +
                            ": " + a + " (unknown type)");
                }
                return b
            };
            h.calculate = function(a) {
                a = this.verifyValue(a);
                if (null === this.type || "object" !== typeof this.type) throw Error("[INTERNAL] Unresolved type in " + this.toString(!0) + ": " + this.type);
                if (null === a || this.repeated && 0 == a.length) return 0;
                var b = 0;
                try {
                    if (this.repeated) {
                        var d, e;
                        if (this.options.packed && 0 <= c.PACKABLE_WIRE_TYPES.indexOf(this.type.wireType)) {
                            b += n.calculateVarint32(this.id << 3 | c.WIRE_TYPES.LDELIM);
                            for (d = e = 0; d < a.length; d++) e += this.calculateValue(a[d]);
                            b += n.calculateVarint32(e);
                            b += e
                        } else
                            for (d = 0; d < a.length; d++) b += n.calculateVarint32(this.id << 3 | this.type.wireType), b += this.calculateValue(a[d])
                    } else b += n.calculateVarint32(this.id << 3 | this.type.wireType), b += this.calculateValue(a)
                } catch (f) {
                    throw Error("Illegal value for " + this.toString(!0) + ": " + a + " (" + f + ")");
                }
                return b
            };
            h.calculateValue = function(a) {
                if (null === a) return 0;
                switch (this.type) {
                    case c.TYPES.int32:
                        return 0 > a ? n.calculateVarint64(a) : n.calculateVarint32(a);
                    case c.TYPES.uint32:
                        return n.calculateVarint32(a);
                    case c.TYPES.sint32:
                        return n.calculateVarint32(n.zigZagEncode32(a));
                    case c.TYPES.fixed32:
                    case c.TYPES.sfixed32:
                    case c.TYPES["float"]:
                        return 4;
                    case c.TYPES.int64:
                    case c.TYPES.uint64:
                        return n.calculateVarint64(a);
                    case c.TYPES.sint64:
                        return n.calculateVarint64(n.zigZagEncode64(a));
                    case c.TYPES.fixed64:
                    case c.TYPES.sfixed64:
                        return 8;
                    case c.TYPES.bool:
                        return 1;
                    case c.TYPES["enum"]:
                        return n.calculateVarint32(a);
                    case c.TYPES["double"]:
                        return 8;
                    case c.TYPES.string:
                        return a = n.calculateUTF8Bytes(a), n.calculateVarint32(a) + a;
                    case c.TYPES.bytes:
                        if (0 > a.remaining()) throw Error("Illegal value for " +
                            this.toString(!0) + ": " + a.remaining() + " bytes remaining");
                        return n.calculateVarint32(a.remaining()) + a.remaining();
                    case c.TYPES.message:
                        return a = this.resolvedType.calculate(a), n.calculateVarint32(a) + a;
                    case c.TYPES.group:
                        return a = this.resolvedType.calculate(a), a + n.calculateVarint32(this.id << 3 | c.WIRE_TYPES.ENDGROUP)
                }
                throw Error("[INTERNAL] Illegal value to encode in " + this.toString(!0) + ": " + a + " (unknown type)");
            };
            h.decode = function(a, b, d) {
                if (a != this.type.wireType && (d || a != c.WIRE_TYPES.LDELIM || !this.repeated)) throw Error("Illegal wire type for field " +
                    this.toString(!0) + ": " + a + " (" + this.type.wireType + " expected)");
                if (a == c.WIRE_TYPES.LDELIM && this.repeated && this.options.packed && 0 <= c.PACKABLE_WIRE_TYPES.indexOf(this.type.wireType) && !d) {
                    a = b.readVarint32();
                    a = b.offset + a;
                    for (d = []; b.offset < a;) d.push(this.decode(this.type.wireType, b, !0));
                    return d
                }
                switch (this.type) {
                    case c.TYPES.int32:
                        return b.readVarint32() | 0;
                    case c.TYPES.uint32:
                        return b.readVarint32() >>> 0;
                    case c.TYPES.sint32:
                        return b.readVarint32ZigZag() | 0;
                    case c.TYPES.fixed32:
                        return b.readUint32() >>> 0;
                    case c.TYPES.sfixed32:
                        return b.readInt32() | 0;
                    case c.TYPES.int64:
                        return b.readVarint64();
                    case c.TYPES.uint64:
                        return b.readVarint64().toUnsigned();
                    case c.TYPES.sint64:
                        return b.readVarint64ZigZag();
                    case c.TYPES.fixed64:
                        return b.readUint64();
                    case c.TYPES.sfixed64:
                        return b.readInt64();
                    case c.TYPES.bool:
                        return !!b.readVarint32();
                    case c.TYPES["enum"]:
                        return b.readVarint32();
                    case c.TYPES["float"]:
                        return b.readFloat();
                    case c.TYPES["double"]:
                        return b.readDouble();
                    case c.TYPES.string:
                        return b.readVString();
                    case c.TYPES.bytes:
                        a =
                            b.readVarint32();
                        if (b.remaining() < a) throw Error("Illegal number of bytes for " + this.toString(!0) + ": " + a + " required but got only " + b.remaining());
                        d = b.clone();
                        d.limit = d.offset + a;
                        b.offset += a;
                        return d;
                    case c.TYPES.message:
                        return a = b.readVarint32(), this.resolvedType.decode(b, a);
                    case c.TYPES.group:
                        return this.resolvedType.decode(b, -1, this.id)
                }
                throw Error("[INTERNAL] Illegal wire type for " + this.toString(!0) + ": " + a);
            };
            l.Message.Field = r;
            h = function(a, b, c, d, e, f, h) {
                r.call(this, a, b, c, d, e, f, h)
            };
            h.prototype = Object.create(r.prototype);
            l.Message.ExtensionField = h;
            l.Message.OneOf = function(a, b, c) {
                q.call(this, a, b, c);
                this.fields = []
            };
            var k = function(a, b, c, e) {
                d.call(this, a, b, c, e);
                this.className = "Enum";
                this.object = null
            };
            (k.prototype = Object.create(d.prototype)).build = function() {
                for (var a = {}, b = this.getChildren(k.Value), c = 0, d = b.length; c < d; ++c) a[b[c].name] = b[c].id;
                Object.defineProperty && Object.defineProperty(a, "$options", {
                    value: this.buildOpt()
                });
                return this.object = a
            };
            l.Enum = k;
            h = function(a, b, c, d) {
                q.call(this, a, b, c);
                this.className = "Enum.Value";
                this.id = d
            };
            h.prototype = Object.create(q.prototype);
            l.Enum.Value = h;
            var g = function(a, b, c, d) {
                q.call(this, a, b, c);
                this.field = d
            };
            g.prototype = Object.create(q.prototype);
            l.Extension = g;
            h = function(a, b, c, e) {
                d.call(this, a, b, c, e);
                this.className = "Service";
                this.clazz = null
            };
            (h.prototype = Object.create(d.prototype)).build = function(a) {
                return this.clazz && !a ? this.clazz : this.clazz = function(a, b) {
                    for (var c = function(b) {
                            a.Builder.Service.call(this);
                            this.rpcImpl = b || function(a, b, c) {
                                setTimeout(c.bind(this, Error("Not implemented, see: https://github.com/dcodeIO/ProtoBuf.js/wiki/Services")),
                                    0)
                            }
                        }, d = c.prototype = Object.create(a.Builder.Service.prototype), e = b.getChildren(a.Reflect.Service.RPCMethod), f = 0; f < e.length; f++)(function(a) {
                        d[a.name] = function(c, d) {
                            try {
                                c && c instanceof a.resolvedRequestType.clazz ? this.rpcImpl(a.fqn(), c, function(c, e) {
                                    if (c) d(c);
                                    else {
                                        try {
                                            e = a.resolvedResponseType.clazz.decode(e)
                                        } catch (f) {}
                                        e && e instanceof a.resolvedResponseType.clazz ? d(null, e) : d(Error("Illegal response type received in service method " + b.name + "#" + a.name))
                                    }
                                }) : setTimeout(d.bind(this, Error("Illegal request type provided to service method " +
                                    b.name + "#" + a.name)), 0)
                            } catch (e) {
                                setTimeout(d.bind(this, e), 0)
                            }
                        };
                        c[a.name] = function(b, d, e) {
                            (new c(b))[a.name](d, e)
                        };
                        Object.defineProperty && (Object.defineProperty(c[a.name], "$options", {
                            value: a.buildOpt()
                        }), Object.defineProperty(d[a.name], "$options", {
                            value: c[a.name].$options
                        }))
                    })(e[f]);
                    Object.defineProperty && (Object.defineProperty(c, "$options", {
                        value: b.buildOpt()
                    }), Object.defineProperty(d, "$options", {
                        value: c.$options
                    }), Object.defineProperty(c, "$type", {
                        value: b
                    }), Object.defineProperty(d, "$type", {
                        value: b
                    }));
                    return c
                }(c, this)
            };
            l.Service = h;
            var t = function(a, b, c, d) {
                q.call(this, a, b, c);
                this.className = "Service.Method";
                this.options = d || {}
            };
            (t.prototype = Object.create(q.prototype)).buildOpt = b.buildOpt;
            l.Service.Method = t;
            b = function(a, b, c, d, e, f) {
                t.call(this, a, b, c, f);
                this.className = "Service.RPCMethod";
                this.requestName = d;
                this.responseName = e;
                this.resolvedResponseType = this.resolvedRequestType = null
            };
            b.prototype = Object.create(t.prototype);
            l.Service.RPCMethod = b;
            return l
        }(f);
        f.Builder = function(c, e, f) {
            var l = function(b) {
                    this.ptr =
                        this.ns = new f.Namespace(this, null, "");
                    this.resolved = !1;
                    this.result = null;
                    this.files = {};
                    this.importRoot = null;
                    this.options = b || {}
                },
                q = l.prototype;
            q.reset = function() {
                this.ptr = this.ns
            };
            q.define = function(b) {
                if ("string" !== typeof b || !e.TYPEREF.test(b)) throw Error("Illegal package: " + b);
                b = b.split(".");
                var c, a;
                for (c = 0; c < b.length; c++)
                    if (!e.NAME.test(b[c])) throw Error("Illegal package: " + b[c]);
                for (c = 0; c < b.length; c++) a = this.ptr.getChild(b[c]), null === a && this.ptr.addChild(a = new f.Namespace(this, this.ptr, b[c])), this.ptr =
                    a;
                return this
            };
            l.isValidMessage = function(b) {
                if ("string" !== typeof b.name || !e.NAME.test(b.name) || "undefined" !== typeof b.values || "undefined" !== typeof b.rpc) return !1;
                var d;
                if ("undefined" !== typeof b.fields) {
                    if (!c.Util.isArray(b.fields)) return !1;
                    var a = [],
                        f;
                    for (d = 0; d < b.fields.length; d++) {
                        if (!l.isValidMessageField(b.fields[d])) return !1;
                        f = parseInt(b.fields[d].id, 10);
                        if (0 <= a.indexOf(f)) return !1;
                        a.push(f)
                    }
                }
                if ("undefined" !== typeof b.enums) {
                    if (!c.Util.isArray(b.enums)) return !1;
                    for (d = 0; d < b.enums.length; d++)
                        if (!l.isValidEnum(b.enums[d])) return !1
                }
                if ("undefined" !==
                    typeof b.messages) {
                    if (!c.Util.isArray(b.messages)) return !1;
                    for (d = 0; d < b.messages.length; d++)
                        if (!l.isValidMessage(b.messages[d]) && !l.isValidExtend(b.messages[d])) return !1
                }
                return "undefined" === typeof b.extensions || c.Util.isArray(b.extensions) && 2 === b.extensions.length && "number" === typeof b.extensions[0] && "number" === typeof b.extensions[1] ? !0 : !1
            };
            l.isValidMessageField = function(b) {
                if ("string" !== typeof b.rule || "string" !== typeof b.name || "string" !== typeof b.type || "undefined" === typeof b.id || !(e.RULE.test(b.rule) &&
                        e.NAME.test(b.name) && e.TYPEREF.test(b.type) && e.ID.test("" + b.id))) return !1;
                if ("undefined" !== typeof b.options) {
                    if ("object" !== typeof b.options) return !1;
                    for (var c = Object.keys(b.options), a = 0, f; a < c.length; a++)
                        if ("string" !== typeof(f = c[a]) || "string" !== typeof b.options[f] && "number" !== typeof b.options[f] && "boolean" !== typeof b.options[f]) return !1
                }
                return !0
            };
            l.isValidEnum = function(b) {
                if ("string" !== typeof b.name || !e.NAME.test(b.name) || "undefined" === typeof b.values || !c.Util.isArray(b.values) || 0 == b.values.length) return !1;
                for (var d = 0; d < b.values.length; d++)
                    if ("object" != typeof b.values[d] || "string" !== typeof b.values[d].name || "undefined" === typeof b.values[d].id || !e.NAME.test(b.values[d].name) || !e.NEGID.test("" + b.values[d].id)) return !1;
                return !0
            };
            q.create = function(b) {
                if (!b) return this;
                c.Util.isArray(b) || (b = [b]);
                if (0 === b.length) return this;
                var d = [];
                for (d.push(b); 0 < d.length;) {
                    b = d.pop();
                    if (c.Util.isArray(b))
                        for (; 0 < b.length;) {
                            var a = b.shift();
                            if (l.isValidMessage(a)) {
                                var e = new f.Message(this, this.ptr, a.name, a.options, a.isGroup),
                                    q = {};
                                if (a.oneofs)
                                    for (var k = Object.keys(a.oneofs), g = 0, n = k.length; g < n; ++g) e.addChild(q[k[g]] = new f.Message.OneOf(this, e, k[g]));
                                if (a.fields && 0 < a.fields.length)
                                    for (g = 0, n = a.fields.length; g < n; ++g) {
                                        k = a.fields[g];
                                        if (null !== e.getChild(k.id)) throw Error("Duplicate field id in message " + e.name + ": " + k.id);
                                        if (k.options)
                                            for (var m = Object.keys(k.options), p = 0, s = m.length; p < s; ++p) {
                                                if ("string" !== typeof m[p]) throw Error("Illegal field option name in message " + e.name + "#" + k.name + ": " + m[p]);
                                                if ("string" !== typeof k.options[m[p]] &&
                                                    "number" !== typeof k.options[m[p]] && "boolean" !== typeof k.options[m[p]]) throw Error("Illegal field option value in message " + e.name + "#" + k.name + "#" + m[p] + ": " + k.options[m[p]]);
                                            }
                                        m = null;
                                        if ("string" === typeof k.oneof && (m = q[k.oneof], "undefined" === typeof m)) throw Error("Illegal oneof in message " + e.name + "#" + k.name + ": " + k.oneof);
                                        k = new f.Message.Field(this, e, k.rule, k.type, k.name, k.id, k.options, m);
                                        m && m.fields.push(k);
                                        e.addChild(k)
                                    }
                                q = [];
                                if ("undefined" !== typeof a.enums && 0 < a.enums.length)
                                    for (g = 0; g < a.enums.length; g++) q.push(a.enums[g]);
                                if (a.messages && 0 < a.messages.length)
                                    for (g = 0; g < a.messages.length; g++) q.push(a.messages[g]);
                                a.extensions && (e.extensions = a.extensions, e.extensions[0] < c.ID_MIN && (e.extensions[0] = c.ID_MIN), e.extensions[1] > c.ID_MAX && (e.extensions[1] = c.ID_MAX));
                                this.ptr.addChild(e);
                                0 < q.length && (d.push(b), b = q, this.ptr = e)
                            } else if (l.isValidEnum(a)) {
                                e = new f.Enum(this, this.ptr, a.name, a.options);
                                for (g = 0; g < a.values.length; g++) e.addChild(new f.Enum.Value(this, e, a.values[g].name, a.values[g].id));
                                this.ptr.addChild(e)
                            } else if (l.isValidService(a)) {
                                e =
                                    new f.Service(this, this.ptr, a.name, a.options);
                                for (g in a.rpc) a.rpc.hasOwnProperty(g) && e.addChild(new f.Service.RPCMethod(this, e, g, a.rpc[g].request, a.rpc[g].response, a.rpc[g].options));
                                this.ptr.addChild(e)
                            } else if (l.isValidExtend(a))
                                if (e = this.ptr.resolve(a.ref))
                                    for (g = 0; g < a.fields.length; g++) {
                                        if (null !== e.getChild(a.fields[g].id)) throw Error("Duplicate extended field id in message " + e.name + ": " + a.fields[g].id);
                                        if (a.fields[g].id < e.extensions[0] || a.fields[g].id > e.extensions[1]) throw Error("Illegal extended field id in message " +
                                            e.name + ": " + a.fields[g].id + " (" + e.extensions.join(" to ") + " expected)");
                                        q = a.fields[g].name;
                                        this.options.convertFieldsToCamelCase && (q = f.Message.Field._toCamelCase(a.fields[g].name));
                                        k = new f.Message.ExtensionField(this, e, a.fields[g].rule, a.fields[g].type, this.ptr.fqn() + "." + q, a.fields[g].id, a.fields[g].options);
                                        q = new f.Extension(this, this.ptr, a.fields[g].name, k);
                                        k.extension = q;
                                        this.ptr.addChild(q);
                                        e.addChild(k)
                                    } else {
                                        if (!/\.?google\.protobuf\./.test(a.ref)) throw Error("Extended message " + a.ref + " is not defined");
                                    } else throw Error("Not a valid definition: " + JSON.stringify(a));
                        } else throw Error("Not a valid namespace: " + JSON.stringify(b));
                    this.ptr = this.ptr.parent
                }
                this.resolved = !1;
                this.result = null;
                return this
            };
            q["import"] = function(b, d) {
                if ("string" === typeof d) {
                    c.Util.IS_NODE && (d = require("path").resolve(d));
                    if (!0 === this.files[d]) return this.reset(), this;
                    this.files[d] = !0
                }
                if (b.imports && 0 < b.imports.length) {
                    var a, e = "/",
                        f = !1;
                    if ("object" === typeof d) {
                        if (this.importRoot = d.root, f = !0, a = this.importRoot, d = d.file, 0 <= a.indexOf("\\") ||
                            0 <= d.indexOf("\\")) e = "\\"
                    } else "string" === typeof d ? this.importRoot ? a = this.importRoot : 0 <= d.indexOf("/") ? (a = d.replace(/\/[^\/]*$/, ""), "" === a && (a = "/")) : 0 <= d.indexOf("\\") ? (a = d.replace(/\\[^\\]*$/, ""), e = "\\") : a = "." : a = null;
                    for (var k = 0; k < b.imports.length; k++)
                        if ("string" === typeof b.imports[k]) {
                            if (!a) throw Error("Cannot determine import root: File name is unknown");
                            var g = b.imports[k];
                            if (!/^google\/protobuf\//.test(g) && (g = a + e + g, !0 !== this.files[g])) {
                                /\.proto$/i.test(g) && !c.DotProto && (g = g.replace(/\.proto$/,
                                    ".json"));
                                var l = c.Util.fetch(g);
                                if (null === l) throw Error("Failed to import '" + g + "' in '" + d + "': File not found");
                                if (/\.json$/i.test(g)) this["import"](JSON.parse(l + ""), g);
                                else this["import"]((new c.DotProto.Parser(l + "")).parse(), g)
                            }
                        } else if (d)
                        if (/\.(\w+)$/.test(d)) this["import"](b.imports[k], d.replace(/^(.+)\.(\w+)$/, function(a, b, c) {
                            return b + "_import" + k + "." + c
                        }));
                        else this["import"](b.imports[k], d + "_import" + k);
                    else this["import"](b.imports[k]);
                    f && (this.importRoot = null)
                }
                b["package"] && this.define(b["package"]);
                var m = this.ptr;
                b.options && Object.keys(b.options).forEach(function(a) {
                    m.options[a] = b.options[a]
                });
                b.messages && (this.create(b.messages), this.ptr = m);
                b.enums && (this.create(b.enums), this.ptr = m);
                b.services && (this.create(b.services), this.ptr = m);
                b["extends"] && this.create(b["extends"]);
                this.reset();
                return this
            };
            l.isValidService = function(b) {
                return !("string" !== typeof b.name || !e.NAME.test(b.name) || "object" !== typeof b.rpc)
            };
            l.isValidExtend = function(b) {
                if ("string" !== typeof b.ref || !e.TYPEREF.test(b.ref)) return !1;
                var d;
                if ("undefined" !== typeof b.fields) {
                    if (!c.Util.isArray(b.fields)) return !1;
                    var a = [],
                        f;
                    for (d = 0; d < b.fields.length; d++) {
                        if (!l.isValidMessageField(b.fields[d])) return !1;
                        f = parseInt(b.id, 10);
                        if (0 <= a.indexOf(f)) return !1;
                        a.push(f)
                    }
                }
                return !0
            };
            q.resolveAll = function() {
                var b;
                if (null != this.ptr && "object" !== typeof this.ptr.type) {
                    if (this.ptr instanceof f.Namespace) {
                        b = this.ptr.children;
                        for (var d = 0, a = b.length; d < a; ++d) this.ptr = b[d], this.resolveAll()
                    } else if (this.ptr instanceof f.Message.Field)
                        if (e.TYPE.test(this.ptr.type)) this.ptr.type =
                            c.TYPES[this.ptr.type];
                        else {
                            if (!e.TYPEREF.test(this.ptr.type)) throw Error("Illegal type reference in " + this.ptr.toString(!0) + ": " + this.ptr.type);
                            b = (this.ptr instanceof f.Message.ExtensionField ? this.ptr.extension.parent : this.ptr.parent).resolve(this.ptr.type, !0);
                            if (!b) throw Error("Unresolvable type reference in " + this.ptr.toString(!0) + ": " + this.ptr.type);
                            this.ptr.resolvedType = b;
                            if (b instanceof f.Enum) this.ptr.type = c.TYPES["enum"];
                            else if (b instanceof f.Message) this.ptr.type = b.isGroup ? c.TYPES.group :
                                c.TYPES.message;
                            else throw Error("Illegal type reference in " + this.ptr.toString(!0) + ": " + this.ptr.type);
                        } else if (!(this.ptr instanceof c.Reflect.Enum.Value))
                        if (this.ptr instanceof c.Reflect.Service.Method)
                            if (this.ptr instanceof c.Reflect.Service.RPCMethod) {
                                b = this.ptr.parent.resolve(this.ptr.requestName);
                                if (!(b && b instanceof c.Reflect.Message)) throw Error("Illegal type reference in " + this.ptr.toString(!0) + ": " + this.ptr.requestName);
                                this.ptr.resolvedRequestType = b;
                                b = this.ptr.parent.resolve(this.ptr.responseName);
                                if (!(b && b instanceof c.Reflect.Message)) throw Error("Illegal type reference in " + this.ptr.toString(!0) + ": " + this.ptr.responseName);
                                this.ptr.resolvedResponseType = b
                            } else throw Error("Illegal service type in " + this.ptr.toString(!0));
                    else if (!(this.ptr instanceof c.Reflect.Message.OneOf || this.ptr instanceof c.Reflect.Extension)) throw Error("Illegal object in namespace: " + typeof this.ptr + ":" + this.ptr);
                    this.reset()
                }
            };
            q.build = function(b) {
                this.reset();
                this.resolved || (this.resolveAll(), this.resolved = !0, this.result =
                    null);
                null === this.result && (this.result = this.ns.build());
                if (b) {
                    b = "string" === typeof b ? b.split(".") : b;
                    for (var c = this.result, a = 0; a < b.length; a++)
                        if (c[b[a]]) c = c[b[a]];
                        else {
                            c = null;
                            break
                        }
                    return c
                }
                return this.result
            };
            q.lookup = function(b) {
                return b ? this.ns.resolve(b) : this.ns
            };
            q.toString = function() {
                return "Builder"
            };
            l.Message = function() {};
            l.Service = function() {};
            return l
        }(f, f.Lang, f.Reflect);
        f.loadProto = function(c, e, n) {
            if ("string" === typeof e || e && "string" === typeof e.file && "string" === typeof e.root) n = e, e = void 0;
            return f.loadJson((new f.DotProto.Parser(c)).parse(),
                e, n)
        };
        f.protoFromString = f.loadProto;
        f.loadProtoFile = function(c, e, n) {
            e && "object" === typeof e ? (n = e, e = null) : e && "function" === typeof e || (e = null);
            if (e) return f.Util.fetch("string" === typeof c ? c : c.root + "/" + c.file, function(l) {
                if (null === l) e(Error("Failed to fetch file"));
                else try {
                    e(null, f.loadProto(l, n, c))
                } catch (b) {
                    e(b)
                }
            });
            var l = f.Util.fetch("object" === typeof c ? c.root + "/" + c.file : c);
            return null === l ? null : f.loadProto(l, n, c)
        };
        f.protoFromFile = f.loadProtoFile;
        f.newBuilder = function(c) {
            c = c || {};
            "undefined" === typeof c.convertFieldsToCamelCase &&
                (c.convertFieldsToCamelCase = f.convertFieldsToCamelCase);
            "undefined" === typeof c.populateAccessors && (c.populateAccessors = f.populateAccessors);
            return new f.Builder(c)
        };
        f.loadJson = function(c, e, n) {
            if ("string" === typeof e || e && "string" === typeof e.file && "string" === typeof e.root) n = e, e = null;
            e && "object" === typeof e || (e = f.newBuilder());
            "string" === typeof c && (c = JSON.parse(c));
            e["import"](c, n);
            e.resolveAll();
            return e
        };
        f.loadJsonFile = function(c, e, n) {
            e && "object" === typeof e ? (n = e, e = null) : e && "function" === typeof e || (e =
                null);
            if (e) return f.Util.fetch("string" === typeof c ? c : c.root + "/" + c.file, function(l) {
                if (null === l) e(Error("Failed to fetch file"));
                else try {
                    e(null, f.loadJson(JSON.parse(l), n, c))
                } catch (b) {
                    e(b)
                }
            });
            var l = f.Util.fetch("object" === typeof c ? c.root + "/" + c.file : c);
            return null === l ? null : f.loadJson(JSON.parse(l), n, c)
        };
        return f
    }
    "function" === typeof require && "object" === typeof module && module && "object" === typeof exports && exports ? module.exports = u(require("bytebuffer")) : "function" === typeof define && define.amd ? define(["ByteBuffer"],
        u) : (s.dcodeIO = s.dcodeIO || {}).ProtoBuf = u(s.dcodeIO.ByteBuffer)
})(this);
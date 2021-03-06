/**
 *
 * Copyright (c) 2013 psteam Inc.(http://www.psteam.co.jp)
 * http://www.psteam.co.jp/qface/license
 * 
 * @Author: liwenfeng
 * @Date: 2013/02/28
 */
define([
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/Stateful"
], function(lang, array, declare, Stateful){
	function update(/*StatefulArray*/ a){
		// summary:
		//		Set all array elements as stateful so that watch function runs.
		// a: StatefulArray
		//		The array.

		// Notify change of elements.
		if(a._watchElementCallbacks){
			a._watchElementCallbacks();
		}

		return a; // StatefulArray
	}

	var StatefulArray = function(/*Anything[]*/ a){
		// summary:
		//		An inheritance of native JavaScript array, that adds dojo/Stateful capability.
		// description:
		//		Supported methods are:
		//
		//		- pop() - Stateful update is done for the removed element, as well as the length.
		//		- push() - Stateful update is done for the added element, as well as the length.
		//		- reverse() - Stateful update is done for the elements.
		//		- shift() - Stateful update is done for the removed element, as well as the length.
		//		- sort() - Stateful update is done for the elements.
		//		- splice() - Stateful update is done for the removed/added elements, as well as the length. Returns an instance of StatefulArray instead of the native array.
		//		- unshift() - Stateful update is done for the added element, as well as the length.
		//		- concat() - Returns an instance of StatefulArray instead of the native Array.
		//		- join() - The length as well as the elements are obtained via stateful getters, instead of direct access.
		//		- slice() - The length as well as the elements are obtained via stateful getters, instead of direct access.
		//		- Setting an element to this array via set() - Stateful update is done for the new element as well as the new length.
		//		- Setting a length to this array via set() - Stateful update is done for the removed/added elements as well as the new length.

		var array = lang._toArray(a);
		var ctor = StatefulArray;
		ctor._meta = {bases: [Stateful]}; // For isInstanceOf()
		array.constructor = ctor;
		return lang.mixin(array, {
			pop: function(){
				return this.splice(this.get("length") - 1, 1)[0];
			},
			push: function(){
				this.splice.apply(this, [this.get("length"), 0].concat(lang._toArray(arguments)));
				return this.get("length");
			},
			reverse: function(){
				return update([].reverse.apply(this, lang._toArray(arguments)));
			},
			shift: function(){
				return this.splice(0, 1)[0];
			},
			sort: function(){
				return update([].sort.apply(this, lang._toArray(arguments)));
			},
			splice: function(/*Number*/ idx, /*Number*/ n){
				// summary:
				//		Removes and then adds some elements to an array.
				//		Updates the removed/added elements, as well as the length, as stateful.
				// idx: Number
				//		The index where removal/addition should be done.
				// n: Number
				//		How many elements to be removed at idx.
				// varargs: Anything[]
				//		The elements to be added to idx.
				// returns: StatefulArray
				//		The removed elements.

				var l = this.get("length"),
				 p = Math.min(idx, l),
				 removals = this.slice(idx, idx + n),
				 adds = lang._toArray(arguments).slice(2);

				// Do the modification in a native manner except for setting additions
				[].splice.apply(this, [idx, n].concat(new Array(adds.length)));

				// Set additions in a stateful manner
				for(var i = 0; i < adds.length; i++){
					this.set(p + i, adds[i]);
				}

				// Notify change of elements.
				if(this._watchElementCallbacks){
					this._watchElementCallbacks(idx, removals, adds);
				}

				// Notify change of length.
				// Not calling the setter for "length" though, given removal/addition of array automatically changes the length.
				if(this._watchCallbacks){
					this._watchCallbacks("length", l, l - removals.length + adds.length);
				}

				return removals; // StatefulArray
			},
			unshift: function(){
				this.splice.apply(this, [0, 0].concat(lang._toArray(arguments)));
				return this.get("length");
			},
			concat: function(/*Array*/ a){
				return new StatefulArray([].concat(this).concat(a));
			},
			join: function(/*String*/ sep){
				// summary:
				//		Returns a string joining string elements in a, with a separator.
				// sep: String
				//		The separator.

				var list = [];
				for(var l = this.get("length"), i = 0; i < l; i++){
					list.push(this.get(i));
				}
				return list.join(sep); // String
			},
			slice: function(/*Number*/ start, /*Number*/ end){
				// summary:
				//		Returns partial elements of an array.
				// start: Number
				//		The index to begin with.
				// end: Number
				//		The index to end at. (a[end] won't be picked up)

				var slice = [], end = typeof end === "undefined" ? this.get("length") : end;
				for(var i = start || 0; i < Math.min(end, this.get("length")); i++){
					slice.push(this.get(i));
				}
				return new StatefulArray(slice); // StatefuArray
			},
			watchElements: function(/*Function*/ callback){
				// summary:
				//		Watch for change in array elements.
				// callback: Function
				//		The callback function, which should take: The array index, the removed elements, and the added elements.

				var callbacks = this._watchElementCallbacks, _self = this;
				if(!callbacks){
					callbacks = this._watchElementCallbacks = function(idx, removals, adds){
						for(var list = [].concat(callbacks.list), i = 0; i < list.length; i++){
							list[i].call(_self, idx, removals, adds);
						}
					};
					callbacks.list = [];
				}

				callbacks.list.push(callback);

				var h = {};
				h.unwatch = h.remove = function(){
					for(var list = callbacks.list, i = 0; i < list.length; i++){
						if(list[i] == callback){
							list.splice(i, 1);
							break;
						}
					}
				}; 
				return h; // dojo/handle
			}
		}, Stateful.prototype, {
			set: function(/*Number|String*/ name, /*Anything*/ value){
				// summary:
				//		Sets a new value to an array.
				// name: Number|String
				//		The property name.
				// value: Anything
				//		The new value.

				if(name == "length"){
					var old = this.get("length");
					if(old < value){
						this.splice.apply(this, [old, 0].concat(new Array(value - old)));
					}else if(value > old){
						this.splice.apply(this, [value, old - value]);
					}
					return this;
				}else{
					var oldLength = this.length;
					Stateful.prototype.set.call(this, name, value);
					if(oldLength != this.length){
						Stateful.prototype.set.call(this, "length", this.length);
					}
					return this;
				}
			}
		});
	};


 	var Model = declare( [Stateful], {
		// summary:
		//		The first-class native JavaScript data model based on dojo.Stateful
		//		that wraps any data structure(s) that may be relevant for a view,
		//		a view portion, a dijit or any custom view layer component.
		//
		//  description:
		//		A data model is effectively instantiated with a plain JavaScript
		//		object which specifies the initial data structure for the model.
		//
		//		|	var struct = {
		//		|		order	: "abc123",
		//		|		shipto	: {
		//		|			address	: "123 Example St, New York, NY",
		//		|			phone	: "212-000-0000"
		//		|		},
		//		|		items : [
		//		|			{ part : "x12345", num : 1 },
		//		|			{ part : "n09876", num : 3 }
		//		|		]
		//		|	};
		//		|
		//		|	var model = Model({ data : struct });
		//
		//		The simple example above shows an inline plain JavaScript object
		//		illustrating the data structure to prime the model with, however
		//		the underlying data may be made available by other means, such as
		//		from the results of a dojo.store or dojo.data query.
		//
		//		To deal with stores providing immediate values or Promises, a
		//		factory method for model instantiation is provided. This method
		//		will either return an immediate model or a model Promise depending
		//		on the nature of the store.
		//
		//		|	var model = Model({ store: someStore });
		//
		//		The created data model has the following properties:
		//
		//		- It enables dijits or custom components in the view to "bind" to
		//		  data within the model. A bind creates a bi-directional update
		//		  mechanism between the bound view and the underlying data:
		//			- The data model is "live" data i.e. it maintains any updates
		//			  driven by the view on the underlying data.
		//			- The data model issues updates to portions of the view if the
		//			  data they bind to is updated in the model. For example, if two
		//			  dijits are bound to the same part of a data model, updating the
		//			  value of one in the view will cause the data model to issue an
		//			  update to the other containing the new value.
		//
		//		- The data model internally creates a tree of dojo.Stateful
		//		  objects that matches the input, which is effectively a plain
		//		  JavaScript object i.e. "pure data". This tree allows dijits or
		//		  other view components to bind to any node within the data model.
		//		  Typically, dijits with simple values bind to leaf nodes of the
		//		  datamodel, whereas containers bind to internal nodes of the
		//		  datamodel. For example, a datamodel created using the object below
		//		  will generate the dojo.Stateful tree as shown:
		//
		//		|	var model = Model({
		//		|		prop1	: "foo",
		//		|		prop2	: {
		//		|			leaf1	: "bar",
		//		|			leaf2	: "baz"
		//		|		}
		//		|	});
		//		|
		//		|	// The created dojo.Stateful tree is illustrated below (all nodes are dojo.Stateful objects)
		//		|	//
		//		|	//	                o  (root node)
		//		|	//	               / \
		//		|	//	 (prop1 node) o   o (prop2 node)
		//		|	//	                 / \
		//		|	//	   (leaf1 node)	o   o (leaf2 node)
		//		|	//
		//		|	// The root node is accessed using the expression "model" (the var name above). The prop1
		//		|	// node is accessed using the expression "model.prop1", the leaf2 node is accessed using
		//		|	// the expression "model.prop2.leaf2" and so on.
		//
		//		- Each of the dojo.Stateful nodes in the model may store data as well
		//		  as associated "meta-data", which includes things such as whether
		//		  the data is required or readOnly etc. This meta-data differs from
		//		  that maintained by, for example, an individual dijit in that this
		//		  is maintained by the datamodel and may therefore be affected by
		//		  datamodel-level constraints that span multiple dijits or even
		//		  additional criteria such as server-side computations.
		//
		//		- When the model is backed by a dojo.store or dojo.data query, the
		//		  client-side updates can be persisted once the client is ready to
		//		  "submit" the changes (which may include both value changes or
		//		  structural changes - adds/deletes). The datamodel allows control
		//		  over when the underlying data is persisted i.e. this can be more
		//		  incremental or batched per application needs.
		//
		//		There need not be a one-to-one association between a datamodel and
		//		a view or portion thereof. For example, multiple datamodels may
		//		back the dijits in a view. Indeed, this may be useful where the
		//		binding data comes from a number of data sources or queries, for
		//		example. Just as well, dijits from multiple portions of the view
		//		may be bound to a single datamodel.
		//
		//		Finally, requiring this class also enables all dijits to become data
		//		binding aware. The data binding is commonly specified declaratively
		//		via the "ref" property in the "data-dojo-props" attribute value.
		//
		//		To illustrate, the following is the "Hello World" of such data-bound
		//		widget examples:
		//		|
		//		|	<input id="helloInput" data-dojo-type="dijit/form/TextBox"
		//		|		data-dojo-props="value: ref('prop2','leaf1')">
		//
		//		Such data binding awareness for dijits is added by extending the
		//		dijit._WidgetBase class to include data binding capabilities
		//		provided by dojox.mvc._DataBindingMixin, and this class declares a
		//		dependency on dojox.mvc._DataBindingMixin.
		//
		//		The presence of a data model and the data-binding capabilities
		//		outlined above support the flexible development of a number of MVC
		//		patterns on the client. As an example, CRUD operations can be
		//		supported with minimal application code.

		//
		// tags:
		//		deprecated
	
		// data: Object
		//		The plain JavaScript object / data structure used to initialize
		//		this model. At any point in time, it holds the lasted saved model
		//		state.
		//		Either data or store property must be provided.
		data: null,

		// store: dojo/store/DataStore
		//		The data store from where to retrieve initial data for this model.
		//		An optional query may also be provided along with this store.
		//		Either data or store property must be provided.
		store: null,
	
		// valid: boolean
		//		Whether this model deems the associated data to be valid.
		valid: true,

		// value: Object
		//		The associated value (if this is a leaf node). The value of
		//		intermediate nodes in the model is not defined.
		value: "",
		
		
		_parent : null,

		//////////////////////// PUBLIC METHODS / API ////////////////////////

		reset: function(){
			// summary:
			//		Resets this data model values to its original state.
			//		Structural changes to the data model (such as adds or removes)
			//		are not restored.
			if(lang.isObject(this.data) && !(this.data instanceof Date) && !(this.data instanceof RegExp)){	
				for(var x in this){
					if(this[x] && lang.isFunction(this[x].reset)){
						this[x].reset();
					}
				}
			}else{
				this.set("value", this.data);
			}
		},

		commit: function(/*"dojo/store/DataStore?"*/ store){
			// summary:
			//		Commits this data model:
			//
			//		- Saves the current state such that a subsequent reset will not
			//		  undo any prior changes.
			//		- Persists client-side changes to the data store, if a store
			//		  has been supplied as a parameter or at instantiation.
			// store:
			//		dojo/store/DataStore
			//		Optional dojo/store/DataStore to use for this commit, if none
			//		provided but one was provided at instantiation time, that store
			//		will be used instead.
			this._commit();
			var ds = store || this.store;
			if(ds){
				this._saveToStore(ds);
			}
		},

		toPlainObject: function(){
			// summary:
			//		Produces a plain JavaScript object representation of the data
			//		currently within this data model.
			// returns:
			//		Object
			//		The plain JavaScript object representation of the data in this
			//		model.
			return getPlainValue(this, Model.getPlainValueOptions);
		},

		splice: function(/*Number*/ idx, /*Number*/ n){
			// summary:
			//		Removes and then adds some elements to this array.
			//		Updates the removed/added elements, as well as the length, as stateful.
			// idx: Number
			//		The index where removal/addition should be done.
			// n: Number
			//		How many elements to be removed at idx.
			// varargs: Anything[]
			//		The elements to be added to idx.
			// returns: dojox/mvc/StatefulArray
			//		The removed elements.

			var a = (new StatefulArray([])).splice.apply(this, lang._toArray(arguments));
			for(var i = 0; i < a.length; i++){
				(this._removals = this._removals || []).push(a[i].toPlainObject());
			}
			return a;
		},

		add: function(/*String*/ name, /*dojo/Stateful*/ stateful){
			// summary:
			//		Adds a dojo/Stateful tree represented by the given
			//		Model at the given property name.
			// name:
			//		The property name to use whose value will become the given
			//		dijit/Stateful tree.
			// stateful:
			//		The Model to insert.
			// description:
			//		In case of arrays, the property names are indices passed
			//		as Strings. An addition of such a dojo/Stateful node
			//		results in right-shifting any trailing sibling nodes.

			if(typeof this.get("length") === "number" && /^[0-9]+$/.test(name.toString())){
				if(this.get("length") < (name - 0)){
					throw new Error("Out of bounds insert attempted, must be contiguous.");
				}
				this.splice(name - 0, 0, stateful);
			}else{
				this.set(name, stateful);
			}
		},

		remove: function(/*String*/ name){
			// summary:
			//		Removes the dojo/Stateful tree at the given property name.
			// name:
			//		The property name from where the tree will be removed.
			// description:
			//		In case of arrays, the property names are indices passed
			//		as Strings. A removal of such a dojo/Stateful node
			//		results in left-shifting any trailing sibling nodes.
			if(typeof this.get("length") === "number" && /^[0-9]+$/.test(name.toString())){
				if(!this.get(name)){
					throw new Error("Out of bounds delete attempted - no such index: " + n);
				}else{
					this.splice(name - 0, 1);
				}
			}else{
				var elem = this.get(name);
				if(!elem){
					throw new Error("Illegal delete attempted - no such property: " + name);
				}else{
					this._removals = this._removals || [];
					this._removals.push(elem.toPlainObject());
					this.set(name, undefined);
					delete this[name];
				}
			}
		},

		match : function(/*String*/path) {
			var names = path.split(".");
			var value = this;
			array.forEach(names,function(name) {
				if (value) {
					value = value.get(name);
				}
			});
			
			return value;
		},


		update: function( /*Model*/ obj){
			var attrs = obj.lstAttrs();
			for(var x in attrs){
				this.set(x, attrs[x]);
			}	
		},
		
		set: function(/*String*/name, /*Object*/value){
			var child = this.get(name);
			if (child === value ) return;
			if (child && child.isInstanceOf && child.isInstanceOf(Model)){
				child.update(value);
			} else {
				//if(lang.isObject(value) && !(value instanceof Date) && !(value instanceof RegExp) && value !== null) {
				//	if (!(value.isInstanceOf && value.isInstanceOf(Model))) {
				//		value = new Model(value);
				//	} 
				//}
				//Stateful.prototype.set.call(this,name,value);
				this.inherited(arguments);
				if (value && value.isInstanceOf && value.isInstanceOf(Model)) {
					value._parent = this;
				}
			}
		},
		
		valueOf: function(){
			// summary:
			//		Returns the value representation of the data currently within this data model.
			// returns:
			//		Object
			//		The object representation of the data in this model.
			return this.toPlainObject();
		},

		toString: function(){
			// summary:
			//		Returns the string representation of the data currently within this data model.
			// returns:
			//		String
			//		The object representation of the data in this model.
			return this.value === "" && this.data ? this.data.toString() : this.value.toString();
		},
		
		lstAttrs : function() {
			var attrs = {};
			for(var s in this){
				if(idModelAttribute(s,this)) {
					attrs[s] = this[s];
				}
			}
			return attrs;
		},
		


		setDirty: function(isDirty) {
			this.dirtyResource = isDirty;
		},

		isDirty: function() {
			return this.dirtyResource;
		},
		
		//////////////////////// PRIVATE INITIALIZATION METHOD ////////////////////////

		constructor: function(/*Object*/ args){
			// summary:
			//		Instantiates a new data model that view components may bind to.
			//		This is a private constructor, use the factory method
			// args:
			//		The mixin properties.
			// description:
			//		Creates a tree of dojo/Stateful objects matching the initial
			//		data structure passed as input. The mixin property "data" is
			//		used to provide a plain JavaScript object directly representing
			//		the data structure.
			// tags:
			//		private
			/*
			var data = (args && "data" in args) ? args.data : this.data;

			if(data != null){
				data = getStateful(data, Model.getStatefulOptions);
				if(lang.isArray(data)){
					// Some consumers of Model inherits it via dojo/declare(), where we cannot use array inheritance technique
					// (dojo/declare() does not support return value in constructor)
					this.length = 0;
					[].splice.apply(this, data);
				}else if(lang.isObject(data)){
					for(var s in data){
						if(data.hasOwnProperty(s)){
							this[s] = data[s];
						}
					}
				}else{
					this.set("value", data);
				}
			}
			*/
		},

		//////////////////////// PRIVATE METHODS ////////////////////////

		_commit: function(){
			// summary:
			//		Commits this data model, saves the current state into data to become the saved state, 
			//		so a reset will not undo any prior changes.  
			// tags:
			//		private
			for(var x in this){
				if(this[x] && lang.isFunction(this[x]._commit)){
					this[x]._commit();
				}
			}
			this.data = this.toPlainObject();
		},

		_saveToStore: function(/*"dojo/store/DataStore"*/ store){
			// summary:
			//		Commit the current values to the data store:
			//
			//		- remove() any deleted entries
			//		- put() any new or updated entries
			// store:
			//		dojo/store/DataStore to use for this commit.
			// tags:
			//		private
			if(this._removals){
				array.forEach(this._removals, function(d){
					store.remove(store.getIdentity(d));
				}, this);
				delete this._removals;
			}
			var dataToCommit = this.toPlainObject();
			if(lang.isArray(dataToCommit)){
				array.forEach(dataToCommit, function(d){
					store.put(d);
				}, this);
			}else{
				store.put(dataToCommit);
			}
		}
	});

	lang.mixin(Model, {
		getStatefulOptions: {
			// summary:
			//		An object that defines how model object should be created from plain object hierarchy.

			getType: function(/*Anything*/ v){
				// summary:
				//		Returns the type of the given value.
				// v: Anything
				//		The value.

				return lang.isArray(v) ? "array" : v != null && {}.toString.call(v) == "[object Object]" ? "object" : "value"; // String
			},

			getStatefulArray: function(/*Anything[]*/ a){
				// summary:
				//		Create a stateful array from a plain array.
				// a: Anything[]
				//		The plain array.

				var _self = this, statefularray = lang.mixin(new StatefulArray(array.map(a, function(item){ return getStateful(item, _self); })));
				for(var s in Model.prototype){
					if(s != "set"){ statefularray[s] = Model.prototype[s]; }
				}
				statefularray.data = a;
				return statefularray;
			},

			getStatefulObject: function(/*Object*/ o){
				// summary:
				//		Create a stateful object from a plain object.
				// o: Object
				//		The plain object.

				var object = new Model();
				object.data = o;
				for(var s in o){
					if (s!=="_parent") {
						object.set(s, getStateful(o[s], this));
					}	
				}
				return object; // Model
			},

			getStatefulValue: function(/*Anything*/ v){
				// summary:
				//		Create a stateful value from a plain value.
				// v: Anything
				//		The plain value.

				return v; // Anything
			}
		},

		getPlainValueOptions: {
			// summary:
			//		An object that defines how plain value should be created from model object.

			getType: function(/*Anything*/ v){
				// summary:
				//		Returns the type of the given value.
				// v: Anything
				//		The value.

				if(lang.isArray(v)){ return "array"; }
				if(lang.isObject(v)){ // Primitive values may have their own properties
					for(var s in v){
						if(v.hasOwnProperty(s) && s != "value" && (v[s] || {}).get && (v[s] || {}).watch){
							return "object";
						}
					}
				}
				return "value";
			},

			getPlainArray: function(/*StatefulArray*/ a){
				return array.map(a, function(item){ return getPlainValue(item, this); }, this);
			},

			getPlainObject: function(/*Model*/ o){
				var plain = {};
				var attrs = o.lstAttrs();
				for(var s in attrs){
					plain[s] = getPlainValue(attrs[s], this);
				}
				return plain;
			},

			getPlainValue: function(/*Anything*/ v){
				return v; // Anything
			}
		}
	});

	var _NOT_ATTRIBUTES = [
		"_parent",
		"_watchCallbacks",
		"data",
		"store",
		"valid",
		"length",
		"dirtyResource"
	]
	var idModelAttribute = function(/*String*/name,/*Object*/ obj) {
	        return ( (obj.hasOwnProperty(name)) && (!lang.isFunction(obj[name])) &&  (_NOT_ATTRIBUTES.indexOf(name)<0) );
	};		
		
		
		var getPlainValue = function(/*Anything*/ value, /*getPlainValueOptions*/ options){
		// summary:
		//		Create a raw value from a dojo/Stateful object.
		// description:
		//		Recursively iterates the stateful value given, and convert them to raw ones.
		// value: Anything
		//		The stateful value.
		// options: dojox/mvc/getPlainValueOptions
		//		The object that defines how plain value should be created from stateful value.
		// returns:
		//		 The converted value.

		return (options || getPlainValue)["getPlain" + (options || getPlainValue).getType(value).replace(/^[a-z]/, function(c){ return c.toUpperCase(); })](value); // Anything
	};

	var getStateful = function(/*Anything*/ value, /*getStatefulOptions*/ options){
		// summary:
		//		Create a dojo/Stateful object from a raw value.
		// description:
		//		Recursively iterates the raw value given, and convert them to stateful ones.
		// value: Anything
		//		The raw value.
		// options: dojox/mvc/getStatefulOptions
		//		The object that defines how model object should be created from plain object hierarchy.
		// returns: Anything
		//		 The converted value.

		return (options || getStateful)["getStateful" + (options || getStateful).getType(value).replace(/^[a-z]/, function(c){ return c.toUpperCase(); })](value); // Anything
	};

	return Model;
});

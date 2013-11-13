define( [
    "require",
	"dojo/_base/declare",
	"qfacex/ui/workbench/_ToolbaredContainer",
	"qfacex/ui/workbench/WorkbenchPart",
	"qfacex/util/GeomUtils",
	"dojo/Deferred",
	"dojo/i18n!./nls/workbench"  
], function(require, declare, ToolbaredContainer,WorkbenchPart, GeomUtils, Deferred, workbenchStrings) {

	var _editorToolbarCreationStarted = {}, _editorToolbarCreated = {};

	return declare([ToolbaredContainer,WorkbenchPart], {

		constructor: function(args){
		},
		
		postCreate: function(){
			this.subscribe("/davinci/ui/editorSelected", function(event){
				if(event.editor == this.editor){
					this.updateToolbars();
				}
			});
			this.subscribe("/davinci/ui/widgetSelected", this.updateToolbars);
			this.subscribe("/davinci/workbench/ready", this.updateToolbars);
		},
		
		layout: function() {
			// Don't show the title bar or tool bar strips above the editors's main content area
			// Note that the toolbar shared by all of the editors gets automagically injected
			// into the Workbench's DIV with id="davinci_toolbar_container".
			this.titleBarDiv.style.display = 'none';
			this.toolbarDiv.style.display = 'none';
			this.inherited(arguments);
		},

		resize: function() {
			this.inherited(arguments);
			// can we combine this with the source editor resize in PageEditor?
			if (this.editor && this.editor.editor && this.editor.editor.getTextView) {
				this.editor.editor.getTextView().resize();
			}
		},

		setEditor: function(editorExtension, fileName, content, file, rootElement, newHtmlParams){
			var d = new Deferred();
			this.editorExtension = editorExtension;
			require([editorExtension.editorClass], function(EditorCtor) {
				try {
					var editor = this.editor = new EditorCtor(this.containerNode, fileName,false,this._workbench);
					var setupEditor = function(){
						if(editor.setRootElement){
							editor.setRootElement(rootElement);
						}
						this.containerNode = editor.domNode || this.containerNode;
						if(typeof editorExtension.editorClassName == 'string'){
							dojo.addClass(this.domNode, editorExtension.editorClassName);
						}
						editor.editorID=editorExtension.id;
						editor.isDirty= !editor.isReadOnly && this.isDirty;
						this._createToolbar(editorExtension.editorClass);
						if (!content) {
							content=editor.getDefaultContent();
							if (editor.isReadOnly || !file.isNew) {
								// if readonly or not a new file, not dirty if we have no content
								editor.isDirty = false;
							} else {
								editor.isDirty = true;
							}
							editor.lastModifiedTime=Date.now();
						}
						if (!content) {
							content="";
						}
						editor.resourceFile=file;
						editor.fileName=fileName;
				
						// Don't populate the editor until the tab is selected.  Defer processing,
						// but also avoid problems with display:none on hidden tabs making it impossible
						// to do geometry measurements in editor initialization
						var editorsContainer = this._workbench.editors_container;
						if(editorsContainer.selectedChildWidget.domNode == this.domNode){
							// Tab is visible.  Go ahead
							editor.setContent(fileName, content, newHtmlParams);

							// keyboard bindings
							this._setupKeyboardHandler();
							dojo.connect(editor, "handleKeyEvent", this, "_handleKeyDown");
						}else{
							// When tab is selected, set up the editor
							var handle = this.subscribe(editorsContainer + "-selectChild", this, function(args){
								if(editor==args.editor){
									handle.remove();
									editor.setContent(fileName, content);

									// keyboard bindings
									this._setupKeyboardHandler();
									dojo.connect(editor, "handleKeyEvent", this, "_handleKeyDown");
								}
							});
						}
						editor.editorContainer=this;
						this.setDirty(editor.isDirty);
					}.bind(this);
					if(editor.deferreds){
						editor.deferreds.then(function(){
							try {
								setupEditor();
								d.resolve(editor);
							} catch (e2) {
								d.reject(e2);
							}
						}, function(e){
							d.reject(e);
						});
					}else{
						//setupEditor.bind(this);
						setupEditor();
						d.resolve(editor);			
					}
				} catch (e) {
					d.reject(e);
				}
			}.bind(this));
			return d;
		},

		setDirty: function (isDirty) {
			//FIXME: davinci.Workbench.hideEditorTabs is always true now
			//Need to clean up this logic (make less hacky)
			//if(!davinci.Workbench.hideEditorTabs){
				var title = this._getTitle();
				if (isDirty){
					title="*"+title;
				}
				var workbench = this._workbench;//require("../Workbench");
				workbench.editorTabs.setTitle(this,title);
			//}
			this.lastModifiedTime=Date.now();
			this.isDirty = isDirty;
		},
		
		_getTitle: function() {
			var title=this.attr("title");
			if (title[0]=="*"){
				title=title.substring(1);
			}
			return title;
		},
		
		save: function(isWorkingCopy){
			this.editor.save(isWorkingCopy);
			this.setDirty(isWorkingCopy);
		},

		_close: function(editor, dirtycheck){
			this.publish("/davinci/ui/EditorClosing", {editor:editor});
			var okToClose = true;
			/*
			 * the dirty check and message is being done at the workbench close table level
			 * So this message and should be dead code, but I leaving it in just on the 
			 * off change we get here by some other path than an editor tab close.
			 */
			if (dirtycheck && editor && editor.isDirty){
				//Give editor a chance to give us a more specific message
				var message = editor.getOnUnloadWarningMessage();
				if (!message) {
					//No editor-specific message, so use our canned one
					message = dojo.string.substitute(workbenchStrings.fileHasUnsavedChanges, [this._getTitle()]);
				}
			    okToClose=confirm(message);
			}
			if (okToClose){
		    	this._isClosing = true;
		    	if(editor.removeWorkingCopy){ 
		    		editor.removeWorkingCopy();
		    	} else if(editor.getFileEditors){
					editor.getFileEditors().forEach(function(editor) {
						if (editor.isReadOnly) {
							return;
						}
						editor.resourceFile.removeWorkingCopy();
					});	
				}else if(editor.resourceFile){
					editor.resourceFile.removeWorkingCopy();	 
				}
		 	}
			return okToClose;
		},
		/* Callback to handle notifier when parent widget closes an
		 * editor tab, usually in response to user clicking on "x" close icon.
		 */
		onClose: function(){
			var dirtyCheck = !this._skipDirtyCheck;
			return this._close(this.editor, dirtyCheck);
		},
		/* forceClose is where daVinci actively removes a child editor.
		 * (eg, saveas might close old editor before creating new editor)
		 */
		forceClose: function(editor, dirtycheck){
			this._close(editor, dirtycheck);
			var parent = this.getParent();
			if(parent){	
				parent.removeChild(this);
				this.destroyRecursive();
			}
		},
		_getViewActions: function() {
			var editorID=this.editorExtension.id;
			var editorActions=[];
			var registry = this._workbench.registry;
			var extensions = registry.getExtensions('davinci.editorActions', function(ext){
				if (editorID==ext.editorContribution.targetID)
				{
					editorActions.push(ext.editorContribution);
					return true;
				}
			});
			if (editorActions.length == 0) {
				var extensions = registry.getExtension('davinci.defaultEditorActions', function(ext){
					editorActions.push(ext.editorContribution);
					return true;
				});
			}
			var libraryActions = registry.metadata.getLibraryActions('davinci.editorActions', editorID);
			// Clone editorActions, otherwise, library actions repeatedly get appended to original plugin object
			editorActions = dojo.clone(editorActions);
			if (editorActions.length > 0 && libraryActions.length) {
				// We want to augment the action list, so let's clone the
				// action set before pushing new items onto the end of the
				// array
				dojo.forEach(libraryActions, function(libraryAction) {
					//var Workbench = require("../Workbench");
					if(libraryAction.action){
						this._workbench._loadActionClass(libraryAction);
					}
					if(libraryAction.menu){
						for(var i=0; i<libraryAction.menu.length; i++){
							var subAction = libraryAction.menu[0];
							if(subAction.action){
								this._workbench._loadActionClass(subAction);
							}
						}
					}
					editorActions[0].actions.push(libraryAction);
				},this);
			}

			return editorActions;
		},

		_getViewContext: function() {
			return this.editor;
		},

		_setupKeyboardHandler: function() {
			var pushBinding = function(o){
				if (!this.keyBindings) {
					this.keyBindings = [];
				}
				this.keyBindings.push(o);
			}.bind(this);

			this._getViewActions().forEach(function(actionSet) {
				actionSet.actions.forEach(function(action) {
					if (action.keyBinding) {
						pushBinding({keyBinding: action.keyBinding, action: action});
					}
					if (action.menu) {
						action.menu.forEach(function(menuItemObj) {
							if (menuItemObj.keyBinding) {
								pushBinding({keyBinding: menuItemObj.keyBinding, action: menuItemObj});
							}
						}, this);
					}
				}, this);
			}, this);
		},

		_handleKeyDown: function(e, isGlobal) {
			var handled = this._handleKey(e, isGlobal);

			var registry = this._workbench.registry;
			// now pass to runtime if unhandled so global key listeners can take a stab
			// make sure to not pass global events back up
			if (!handled && !isGlobal) {
				registry.handleKeyEvent(e);
			}
		},

		_handleKey: function(e, isGlobal) {
			if (!this.keyBindings) {
				return false;
			}

			var workbench = this._workbench;
			var stopEvent = this.keyBindings.some(function(globalBinding) {
				if (isGlobal && !globalBinding.keyBinding.allowGlobal) {
					return;
				}

				if (workbench.isKeyEqualToEvent(globalBinding.keyBinding, e)) {
					workbench._runAction(globalBinding.action, this.editor, globalBinding.action.id);
					return true;
				}
			}, this);

			if (stopEvent) {
				dojo.stopEvent(e);
			}

			return stopEvent;
		},

		destroy: function() {
			this.inherited(arguments);
			//TODO: should we implement getChildren() in _ToolbaredContainer instead so that the children will get destroyed automatically?
	        if (this.editor){
	        	this.editor.destroy();
	        }
	        delete this.editor;
		},
		
		_updateToolbar: function(toolbar){
			// Call a function on an action class
			// Only used for 'shouldShow' and 'isEnabled'
			function runFunc(action, funcName){
				var retval = true;
				if(action && action.action &&  action.action[funcName]){
					retval = action.action[funcName]();
				} else if(action && action[funcName]){
					retval = action[funcName]();
				}
				return retval;
			}
			function hideShowWidget(widget, action){
				var shouldShow = runFunc(action, 'shouldShow');
				if(shouldShow){
					dojo.removeClass(widget.domNode, 'maqHidden');
				}else{
					dojo.addClass(widget.domNode, 'maqHidden');
				}
				
			}
			function enableDisableWidget(widget, action){
				var enabled = runFunc(action, 'isEnabled');
				widget.set('disabled', !enabled);
			}
			function updateStyling(widget, action){
				runFunc(action, 'updateStyling');
			}
			
			if(toolbar && this.editor){
				var context = this.editor.getContext ? this.editor.getContext() : null;
				if(context){
					var children = toolbar.getChildren();
					for(var i=0; i<children.length; i++){
						var child = children[i];
						hideShowWidget(child, child._maqAction);
						enableDisableWidget(child, child._maqAction);
						updateStyling(child, child._maqAction);
						var menu = child.dropDown;
						if(menu){
							var menuItems = menu.getChildren();
							for(var j=0; j<menuItems.length; j++){
								var menuItem = menuItems[j];
								hideShowWidget(menuItem, menuItem._maqAction);
								enableDisableWidget(menuItem, menuItem._maqAction);
								updateStyling(menuItem, menuItem._maqAction);
							}
						}
					}
				}
			}
			
		},
		
		/**
		 * Enable/disable various items on the editor toolbar and action bar
		 */
		updateToolbars: function(){
			var workbench = this._workbench;
			if(this.editor == workbench.currentEditor){
				var toolbarDiv = this.getToolbarDiv();
				if(toolbarDiv){
					toolbarDiv.innerHTML = '';
				}
				var toolbar = this.toolbarCreated(this.editorExtension.editorClass);
				if(toolbarDiv && toolbar && toolbar.domNode){
					toolbarDiv.appendChild(toolbar.domNode);
				}
				//var editorToolbarNode = dojo.query('.davinci_toolbar_container .dijitToolbar',workbench.domNode)[0];
				//var editorToolbar = editorToolbarNode ? dijit.byNode(editorToolbarNode) : null;
				//this._updateToolbar(editorToolbar);
				this._updateToolbar(toolbar);
			}
		},
		
		/**
		 * Override the _createToolbar function in _ToolbaredContainer.js to redirect
		 * the toolbar creation logic to target the DIV with id="davinci_toolbar_container"
		 */
		_createToolbar: function(editorClass){
			if(this.toolbarCreated(editorClass) || _editorToolbarCreationStarted[editorClass]){
				return;
			}
			_editorToolbarCreationStarted[editorClass] = true;
			this.inherited(arguments);
		},
		
		/**
		 * Returns an {Element} that is the container DIV into which editor toolbar should go
		 * This function can be overridden by subclasses (e.g., EditorContainer.js)
		 */
		getToolbarDiv: function(){
			var workbench = this._workbench;
			return workbench.davinci_toolbar_container.domNode;// return dojo.byId("davinci_toolbar_container");
		},
		
		/**
		 * Getter/setting for whether toolbar has been created.
		 * Note that this function overrides the function from _ToolbaredContainer.js
		 * @param {string} editorClass  Class name for editor, such as 'davinci.ve.PageEditor'
		 * @param {boolean} [toolbar]  If provided, toolbar widget
		 * @returns {boolean}  Whether toolbar has been created
		 */
		toolbarCreated: function(editorClass, toolbar){
			if(arguments.length > 1){
				_editorToolbarCreated[editorClass] = toolbar;
			}
			return _editorToolbarCreated[editorClass];
		}
	});
});

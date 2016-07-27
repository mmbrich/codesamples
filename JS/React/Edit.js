var React = require('react');
var work = require('webworkify');

import Workbench from './Workbench.js';
import PreviewToolBar from './Preview.js';
import ExtrasSettings from './Extras.js';

var FieldSelectorList = require('./Workbench/FieldSelectorList.js');
var Relationships = require('./Workbench/Relationships.js');
var Dates = require('./Workbench/CurrentDates.js');
var UserInfo = require('./Workbench/UserInfo.js');

var Setup = React.createClass({
    getInitialState: function() {
        return {
            count: 0,
	    preview: '',
            saveTime: 5,
            devPills: 0,
            undoCount: 0,
            pageCount: 0,
            itemId: null,
            saving: false,
            needSave: false,
            headerChange: false,
            footerChange: false,
            executingFlow: false,
            documentFlowControl: false,
            saveTimer: null,
	    slideName: 'editor',
	    consoleReady: false,
            prefetchedRelationships: false,
            org: {},
            app: {},
	    items: [],
	    pageData: {pageType: 'A4', orientation: window.template.orientation, highlightElements:false, marginTop:window.template.marginTop, marginBottom:window.template.marginBottom, marginLeft: window.template.marginLeft, marginRight: window.template.marginRight},
	    items_in: [],
            itemRefs: [],
	    items_out: [],
            workspace: {},
            appFields: [],
            rel_fields: [],
            fieldValues: {},
            relationshipFields: {},
	    prints:window.prints,
            fields: window.fields,
            app_id: window.app_id,
            template: window.template,
            app_name: window.app_name,
            app_link: window.app_link,
            templateId: window.template.id,
            templateTitle: window.template.title,
            templateHeader: window.template.header,
            templateFooter: window.template.footer,
            templateText: window.template.template,
            templateOrientation: window.template.orientation,
            appFieldId: window.template.appFieldId,
            menuDates: 'closed',
            menuUser: 'closed',
            menuField: 'closed',
            menuRelation: 'closed',
	    fieldWorker: work(require('../workers/WebWorkerFieldsWorker.js')),
            socket: io.connect(window.location.hostname + ':3000/', {'sync disconnect on unload': true } )
        }
    },

    setupSocket: function() {
        this.state.socket.on('*', function(data) {
                this.devLog("catch");
                this.devLog(data);
        }.bind(this));
        this.state.socket.on('connect', function() {
                //this.devLog("connect");
                this.state.socket.emit('subscribe',
                    {channel:'podio.update',
                    user: window.userId,
                    app: this.state.app_id,
                    org: this.state.workspace.org_id,
                    workspace: this.state.app.space_id,
                    itemID: this.state.itemId,
                    templateId: this.state.templateId,
                    appFieldId: this.state.appFieldId,
                    templateTitle: this.state.templateTitle
                    }
                );
        }.bind(this));
        this.state.socket.on('subscribed', function() {
                //this.devLog("subscribed");
        }.bind(this));
        this.state.socket.on('acknowledge', function() {
                //this.devLog("acknowledge");
        }.bind(this));
        this.state.socket.on('warning', function(data) {
                //this.devLog("warning");
                this.popup(data,'warning');
        }.bind(this));
        this.state.socket.on('deverror', function(data) {
                this.devLog(data);
		var myd = JSON.parse(data);
		if(typeof myd.data.message.error_propagate != 'undefined') {
			if(myd.data.message.error_propagate)
                		this.popup("PODIO Says: "+myd.data.message.error_description,'error');
		}
        }.bind(this));
        this.state.socket.on('greeting', function(data) {
                //this.devLog("greeting");
                this.popup(data,'information');
        }.bind(this));
        this.state.socket.on('itemUpdate', function() {
                if(this.state.itemId != 'null') {
                        this.fetchItem(this.state.itemId);
			this.state.fieldWorker.postMessage({cmd:'setupFields', fields:this.state.fields });
			//this.setupFields();
                        this.popup("PODIO Item Data Updated!", 'warning');
                }
        }.bind(this));
    },

    setPropState: function(payload, loc) {
    	//this.devLog("set prop state from "+loc);
    	if(typeof payload === "undefined")
    		return 
    	else
    		this.setState(payload);

    },

    onFieldMessage: function(e) {
	var message = e.data;
	//console.log("Field Worker Replied:");
	//console.log(message);

	if(message.cmd == 'setupFields') {
        	this.setState({rel_fields: message.data.rel_fields});
	}
	if(message.cmd == 'setAppData') {
        	this.setState({app: message.data});
	}
	if(message.cmd == 'setOrgData') {
        	this.setState({org: message.data});
	}
	if(message.cmd == 'setWorkspaceData') {
        	this.setState({workspace: message.data});
	}
	if(message.cmd == 'setState') {
        	this.setState(message.data);
	}
    },

    componentDidMount: function() {
        this.getPodioItemsList();
	/* spin up our worker thread and get it started on some processing */
	this.state.fieldWorker.onmessage = this.onFieldMessage;
	this.state.fieldWorker.postMessage({cmd:'getPodioAppInfo', app_id:this.state.app_id, loc: window.location.origin});
	this.state.fieldWorker.postMessage({cmd:'setupFields', fields:this.state.fields});

	/* setup our signal socket */
	this.setupSocket();

	this.onMoveSlide(0);
	$('#editCarousel').off('keydown.bs.carousel');

	$( window ).bind('beforeunload', function() {
		if(this.state.needSave) 
			return 'You have unsaved changes!\r\nYou will lose any unsaved data if you leave.';
	}.bind(this));
	$( window ).bind('unload', function() {
		this.unloadPage();
	}.bind(this));
    },

    unloadPage: function() {
	// socket tear down
        this.state.socket.disconnect(true);
        this.state.socket.destroy();
        this.setState({socket:null});
    },

    updatePreviewImage: function() {
    	this.refs['workbench'].updatePreviewImage();
    },

    onRelatedItemClicked: function(valueString) {
	if(this.state.slideName == "extras")
		this.refs['extras'].insert(valueString);
	else
        	this.refs['workbench'].refs['editor'].insert(valueString);
    },

    onListItemClicked: function(field, event) {
	if(this.state.slideName == "extras")
		this.refs['extras'].insert(this.state.app_id + "_" + field.field_id);
	else
        	this.refs['workbench'].refs['editor'].insert(this.state.app_id + "_" + field.field_id);
    },

    onListItemValueClicked: function(field_id, value) {
	if(this.state.slideName == "extras")
        	this.refs['extras'].insert(this.state.app_id + "_" + field_id + "[" + value + "]");
	else
        	this.refs['workbench'].refs['editor'].insert(this.state.app_id + "_" + field_id + "[" + value + "]");
    },

    insertImageRelated: function(variable, width, height) {
        this.refs['workbench'].refs['editor'].insertImageRelated(variable, width, height);
    },

    insertImageHardFetch: function(variable, width, height) {
        this.refs['workbench'].refs['editor'].insertImageHardFetch(variable, width, height);
    },

    insertImage: function(variable, width, height) {
        this.refs['workbench'].refs['editor'].insertImage(variable, width, height);
    },

    insertCondition: function() {
        this.refs['workbench'].refs['editor'].insertCondition();
    },

    insertPrefetched: function(string) {
        this.refs['workbench'].refs['editor'].insertHardFetch(string)
    },

    attachHooks: function() {
        $.ajax({
            method: "POST",
            url: "/template/item/hooks",
            data: {
                app_id: this.state.app_id,
                template_id: this.state.templateId
            }
        }).success(function(response){
            //console.log(response);
        })
    },

    getPodioItemsList: function() {
        $.ajax({
            "url": "/podio/items/" + this.state.app_id + '/list',
            "method": "GET"
        }).done( (data) => { 
                //console.log("item lists");
                //console.log(data);
            this.setState({items: data});
            this.attachHooks();
        }.bind(this));
    },

    fetchItemAbstract: function(e) {
	e.preventDefault();
	this.fetchItem(e.target.value);
    },

    fetchItem: function(itemId) {
        if(itemId === "none") {
            this.setState({
                fieldValues: {},
                itemId: null,
                relationshipFields: {},
                prefetchedRelationships: false
            })
        } else {
            this.state.socket.emit('subscribe-item',
                {channel:'podio.item',
                user: window.userId,
           	itemId: itemId}
            );
            this.setState({
                itemId: itemId,
                fieldValues: {},
                relationshipFields: {},
                prefetchedRelationShips: false
            }, () => {
	    	this.state.fieldWorker.postMessage({cmd:'fetchItem', itemId:itemId, loc:window.location.origin});
            })
        }
    },

    startLoading: function() {
    },
    doneLoading: function() {
    },

    popup: function (message, type) {
        return noty({
            text: message,
            type: type,
            timeout: 3000,
            layout: 'bottomCenter',
            animation: {
                open: 'animated flipInX',
                close: 'animated flipOutX'
            }
        });
    },

    saveTemplate: function(callback) {
        this.refs['workbench'].storageWorkerSaveTemplate(callback);
    },

    saveHeaderFooters: function(callback) {
    },

    refreshPreview: function() {
	$('#previewPortrait').addClass("previewLoading");
	this.popup("Transforming Document!", 'warning');
        if(this.state.itemId <= 0) {
        	this.popup("No Item Selected!", 'error');
        	$('#previewPortrait').removeClass("previewLoading");
		return;
	}
        this.saveTemplate(function() {
	    /* this is executed in the scope of the Workbench page */
            $.get("/template/" + this.props.templateId + "/transform/"+this.props.itemId).done(
		function(data) {
                        this.props.updatePreview(data);
                        this.popup("Document Transformed!", 'warning');
                        $('#previewPortrait').removeClass("previewLoading");
            	}.bind(this)
	    );
	});
    },

    updatePreview: function(contents) {
	var iframe = document.getElementById('preview-iframe');

	try {
        var doc = iframe.document;
        if(iframe.contentDocument)
                doc = iframe.contentDocument; // For NS6
        else if(iframe.contentWindow)
                doc = iframe.contentWindow.document; // For IE5.5 and IE6
	} catch(e) {}

        // Put the content in the iframe
	var html = "<html><head>";
	html += '</head><body>';
	html += contents.template;
	html += "</body></html>";

        doc.open();
        doc.writeln(html);
        doc.close();
        iframe.style.height = iframe.contentWindow.document.body.scrollHeight + 'px';
    },

    moveSlide: function(e) {
    	var name = e.target.name;
    	var num = 0;
    	switch(name) {
    	    case 'editor':
    		//this.saveTemplate();
    		num = 0;
    	 	break;
    	    case 'preview':
    		num = 1;
    		this.refreshPreview();
    	 	break;
    	    case 'features':
    		//this.saveTemplate();
    		num = 2;
    	 	break;
    	}
    	this.setState({slideName:name});
    	this.onMoveSlide(num);
    },

    onMoveSlide: function(dest) {
        $("#editCarousel").carousel(dest);
    },

    toggleItems: function(e) {
    	e.preventDefault();
    	$("#wrapper").toggleClass("toggled");
    },

    devLog: function(log) {
	if(!window.isLocal)
		return;

	if(this.state.consoleReady)
     		this.refs['workbench'].devLog(log);
	else
		return;
    },

    render: function () {
        return (
            <div>
                <div className="section-header">
                    <div className="container">
            			<button type="button" onClick={this.toggleItems} name="items" className="pull-left btn btn-default pull-more-left">
            				  <span className="glyphicon glyphicon-menu-hamburger"></span>
            			</button>
                        <ul className="nav nav-tabs">
                                <li><a href="#" onClick={this.moveSlide} name="editor" >Edit Template</a></li>
                                <li><a href="#" onClick={this.moveSlide} name="preview"  >Preview</a></li>
                                <li><a href="#" onClick={this.moveSlide} name="features" >Header/Footer</a></li>
                        <select onChange={this.fetchItemAbstract} value={this.state.itemId || "none"} className="form-control" style={{width: "300px", display: "inline-block"}}>
                            <option value="none">None</option>
                            {this.state.items && this.state.items.map(function(item){
                                    return (
                                        <option value={item.item_id} key={item.item_id} >{item.title || item.item_id}</option>
                                    )
                            }.bind(this))}
                        </select>
                        </ul>
                    </div>
                </div>

        <div id="page-content-wrapper">
 	<div id="wrapper" >
        <div id="sidebar-wrapper" className="slideout-menu">
            <ul className="sidebar-nav">
                    <div className="field-selector-list-parent col-lg-12 col-md-12 col-sm-12 padding-menu">
                        <Dates ref="current-dates"
                            
                            menuDates={this.state.menuDates}
                            menuUser={this.state.menuUser} 
                            menuField={this.state.menuField}
                            menuRelation={this.state.menuRelation}
                            pageCount={this.state.pageCount}

                            onRelatedItemClicked={this.onRelatedItemClicked}
                            setPropState={this.setPropState} 
                        />
                   </div>
                   <div className="field-selector-list-parent col-lg-12 col-md-12 col-sm-12 padding-menu">
                        <UserInfo ref="user-info"
                            
                            menuDates={this.state.menuDates}
                            menuUser={this.state.menuUser} 
                            menuField={this.state.menuField}
                            menuRelation={this.state.menuRelation}

                            onRelatedItemClicked={this.onRelatedItemClicked}
                            setPropState={this.setPropState} 
                        />
                   </div>
                    <div className="field-selector-list-parent col-lg-12 col-md-12 col-sm-12 padding-menu">
                        <FieldSelectorList ref="field-selector" 
                            appId={this.state.appId}
                            fields={this.state.fields}
                            rel_fields={this.state.rel_fields}
                            fieldValues={this.state.fieldValues}
            		    items={this.state.items} 
            		    items_in={this.state.items_in} 
            		    items_out={this.state.items_out} 
                            itemId={this.state.itemId}

			    setPropState={this.setPropState} 
                            itemValueClicked={this.onListItemValueClicked}
                            itemClicked={this.onListItemClicked}
                            insertCondition={this.insertCondition} 
			    devLog={this.devLog} 
                            
                            menuDates={this.state.menuDates}
                            menuUser={this.state.menuUser} 
                            menuField={this.state.menuField}
                            menuRelation={this.state.menuRelation}
			             />
                    </div>
                     <div className="field-selector-list-parent col-lg-12 col-md-12 col-sm-12 padding-menu">
                        <Relationships ref="relationship-selector" 
                            items={this.state.items} 
                            items_in={this.state.items_in} 
                            items_out={this.state.items_out} 
                            itemId={this.state.itemId}
                            fields={this.state.fields}
                            fieldValues={this.state.fieldValues}
                            doneLoading={this.doneLoading}
                            itemRefs={this.state.itemRefs}
                            appFields={this.state.appFields}
                            insertPrefetched={this.insertPrefetched}
                            onRelatedItemClicked={this.onRelatedItemClicked}
                            relationshipFields={this.state.relationshipFields}
                            prefetchedRelationships={this.state.prefetchedRelationships}
                            setPropState={this.setPropState} 
                            devLog={this.devLog} 

                            
                            menuDates={this.state.menuDates}
                            menuUser={this.state.menuUser} 
                            menuField={this.state.menuField}
                            menuRelation={this.state.menuRelation}
                        />
                    </div>
            </ul>
        </div>
        
        </div>
                <div id="editCarousel" className="carousel slide " data-ride="carousel" data-interval="false">
                    <div className="carousel-inner">
                        <div className="active item">
				<Workbench ref="workbench" 
                			fieldValues={this.state.fieldValues}
                			relationshipFields={this.state.relationshipFields}
                			prefetchedRelationShips={this.state.prefetchedRelationships}

            				devPills={this.state.devPills}
            				appId={this.state.app_id}
            				items={this.state.items}
            				pageData={this.state.pageData}
            				pageCount={this.state.pageCount}
            				itemId={this.state.itemId}
            				template={this.state.template}
            				templateId={this.state.templateId}
            				templateTitle={this.state.templateTitle}
            				templateHeader={this.state.templateHeader}
            				templateFooter={this.state.templateFooter}
            				templateText={this.state.templateText}
            				appFieldId={this.state.appFieldId}
            				appFields={this.state.appFields} 
            				itemRefs={this.state.itemRefs} 
            				fields={this.state.fields}
            				org={this.state.org}
            				app={this.state.app}
            				app_id={this.state.app_id}
            				workspace={this.state.workspace}
            				saving={this.state.saving}
 			           	needSave={this.state.needSave}
 			           	executingFlow={this.state.executingFlow}
            				undoCount={this.state.undoCount}
            				saveIcon={this.state.saveIcon}
            				refreshIcon={this.state.refreshIcon}
            				documentFlowControl={this.state.documentFlowControl}
            				saveTime={this.state.saveTime}
            				saveTimer={this.state.saveTimer}
            				autoSaveTimer={this.autoSaveTimer}

        				moveSlide={this.onMoveSlide} 
        				refreshPreview={this.refreshPreview} 
        				updatePreview={this.updatePreview} 
        				popup={this.popup} 

    			    		setPropState={this.setPropState} 
    					saveTemplate={this.saveTemplate}
            				fetchItem={this.fetchItem} 

                            		menuTab={this.menuTab}
                            		menuDates={this.state.menuDates}
                            		menuUser={this.state.menuUser} 
                            		menuField={this.state.menuField}
                            		menuRelation={this.state.menuRelation} 
				/>
			</div>
                        <div className="item">
				<PreviewToolBar ref="preview" 	
            				pageData={this.state.pageData}
            				pageCount={this.state.pageCount}
            				template={this.state.template}
            				templateId={this.state.templateId}
            				templateText={this.state.templateText}
            				templateTitle={this.state.templateTitle}

            				appFieldId={this.state.appFieldId}
            				itemId={this.state.itemId}
					     
        					moveSlide={this.onMoveSlide} 
        					refreshPreview={this.refreshPreview} 
            				popup={this.popup} 
    			    		devLog={this.devLog} 
				/>
			</div>
                        <div className="item">
				<ExtrasSettings ref="extras"
            				pageData={this.state.pageData}
            				pageCount={this.state.pageCount}
            				templateId={this.state.templateId}
            				templateText={this.state.templateText}
            				templateFooter={this.state.templateFooter}
            				templateHeader={this.state.templateHeader}
        					saveTemplate={this.saveTemplate}
        					saveHeaderFooters={this.saveHeaderFooters}
    			    		setPropState={this.setPropState} 
            				saving={this.state.saving}
 			           	    needSave={this.state.needSave}
            				saveIcon={this.state.saveIcon}
            				undoCount={this.state.undoCount}
            				refreshIcon={this.state.refreshIcon}
    					    popup={this.popup} 
    			    		devLog={this.devLog} 
    					    moveSlide={this.onMoveSlide} 
				/>
			</div>
                    </div>
                </div>
    	    </div>
        </div>
        );
    }
});

var container = document.getElementById('neweditTemplateContent');
if (container)
    React.render(
        <Setup 
	/>,
        container
    );

var React = require('react');
var _ = require('underscore');
var work = require('webworkify');

var Editor = require('./Workbench/Editor.js');

export default React.createClass({

    getInitialState: function() {
        return {
            loading: false,
	    pages: [],
	    pageTypes: [{id:0, name:'A3'},{id:1,name:'A4'},{id:2,name:'A5'}],
	    orientations: [{id: 0, name: 'landscape'}, {id:1, name: 'portrait'}],
	    pageFeatures: [
		{id: 0, name: 'highlightElements', value: true, title: 'Highlight Elements'}
	    ],
	    saveTimers: [
		{name: "off", value: "0"},
		{name: "1 Minute", value: "2"},
		{name: "1.5 Minutes", value: "3"},
		{name: "2 Minutes", value: "4"},
		{name: "2.5 Minute", value: "5"},
		{name: "3 Minute", value: "6"}
	    ],
	    highlightElements: false,
	    allowOverflow: true,
	    allowUnderflow: true,
	    marginTop:window.template.marginTop,
	    marginBottom:window.template.marginBottom,
	    marginLeft:window.template.marginLeft,
	    marginRight:window.template.marginRight,
	    storageWorker: work(require('../workers/WebWorkerStorageWorker.js'))
        }
    },

    onStorageMessage: function(e) {
	var message = e.data;
	var hasCallback = false
	if(typeof message.callback != 'undefined')
		hasCallback=true;

	//console.log("Storage worker said: "+message.cmd+" Executing callback: "+hasCallback);
	if(message.cmd == "saved") {
		this.setPropState({saving:false, needSave:false});
		this.updatePreviewImage();
	}
	if(message.cmd == "previewImageUpdated") {
		var img = $("#preview-image");
		var d = new Date();
		img.attr("src", "/template/"+this.props.templateId+"/image/"+this.props.templateId+".jpg?"+d.getTime());
		this.setState({loading: false});
	}
	if(message.cmd == "autoSave") {
		if(this.props.needSave && !this.props.saving) {
    			this.storageWorkerSaveTemplate(function(message) {
				this.popup("Auto Saved","information");
			});
		}
	}
	if(typeof message.callback == 'string') {
		try {
			var callback = this.getInternalFunction(message.callback);
			if(callback)
				callback(message);
		} catch(er) {console.log(er);}
	}
    },

    getInternalFunction: function (funcStr) {
	var argName = funcStr.substring(funcStr.indexOf("(") + 1, 
		funcStr.indexOf(")"));
	funcStr = funcStr.substring(funcStr.indexOf("{") + 1, 
		funcStr.lastIndexOf("}"));
	try {
		var func = new Function(argName, funcStr).bind(this);
	} catch(er) {
		console.warn("Do not use .bind() on your callback function.  (this) (from Workbench page) will be inherited and the worker message passed to you as a function call variable.");
		var func = false;
	}
	return func;
    },

    insertIntoTitle: function(text) {
	// this change trigger is not working
        $('#title').val($('#title').val() + '${' + text + '}').trigger("change");
    },

    printWithItem: function (e) {
	e.preventDefault();
	if(!Number.isInteger(parseInt(this.props.itemId))) {
		this.props.popup("You must select an Item","error");
		return;
	}

	this.props.popup("Transforming Template","warning");
        var data = {
            id: this.props.templateId,
            item_id: this.props.itemId
        };
        var location = "/template/" + data.id + "/pdf/" + data.item_id;
        window.location = location;
    },

    uploadToPodio: function () {
	if(!Number.isInteger(parseInt(this.props.itemId))) {
		this.props.popup("You must select an Item","error");
		return;
	}

	this.props.popup("Tranfering to Podio.  Please Wait.","warning");
        var info = {
            id: this.props.templateId,
            app_id: this.props.appId,
            item_id: this.props.itemId
        };
        $.ajax({
            method: "POST",
            url: "/template/podio/upload",
            data: info
        }).success(function(data){
	    this.props.popup("File transfer complete.","information");
            //console.log(data);
        }.bind(this))
    },

    saveSettings: function(status) {
        var id = this.props.templateId;
        var orientation = this.props.pageData.orientation.toLowerCase();

    	var newName = $('#title').val();
    	if(newName == "") {
    		newName = this.props.template.title;
        }

	this.setPropState({templateTitle: $('#title').val()});
        var settings = {
            app_id: this.props.appId,
            appFieldId: this.props.appFieldId,
            oldTitle: this.props.template.title,
            newTitle: newName,
            orientation: orientation
        };
	if (status == 'active' || status =='deleted'){
    		settings.status = status;
    		//console.log(settings.status);
	} 

        $.ajax({
            method: "POST",
            url: "/template/" + id + "/update",
            data: settings
        }).success(function(data){
            //console.log(data);
	    this.props.popup("Saved","information");
        }.bind(this))
    },

    bytesToSize: function (bytes) {
        if(bytes < 1024) return bytes + " Bytes";
        else if(bytes < 1048576) return(bytes / 1024).toFixed(3) + " KB";
        else if(bytes < 1073741824) return(bytes / 1048576).toFixed(3) + " MB";
        else return(bytes / 1073741824).toFixed(3) + " GB";
    },

    renderTitleChange: function (e) {
	// this function does not work for inserting variables
	this.setPropState({templateTitle: e.target.value});
	e.preventDefault();
    },

    pageTypeSelect: function(e) {
	var pageData = this.props.pageData;
	pageData.pageTyp = e.target.value;
        this.setPropState({pageData: pageData});

	var ed = CKEDITOR.instances["pageEditor"];
	var editor = ed.document;
	var elem = editor.$.getElementsByTagName("page");
	$.each(elem, function(index,el) {
		el.setAttribute('size', e.target.value);
	}.bind(this));

	window.onlyUpdate=true;
	window.executingFlow=false;
	window.storePageInfo();
	window.onlyUpdate=false;

	window.forceParse=true;
	ed.fire("change");
	//window.forceParse=false;
	//setTimeout(window.storePageInfo,0);
    },

    updateMargin: function(e) {
	//console.log(e.target.id);
	var pageObj = this.props.pageData;
	pageObj[e.target.id] = e.target.value;
	this.setPropState(pageObj);
	e.preventDefault();
    },

    changeMargin: function(e) {
	this.setState({[e.target.id]: e.target.value});
	var ed = CKEDITOR.instances["pageEditor"];
	var editor = ed.document;
	ed.fire("extraschange");
    },

    orientationSelect: function(e) {
	var pageData = this.props.pageData;
	pageData.orientation = e.target.value.toLowerCase();
        this.setPropState({pageData: pageData});

	var ed = CKEDITOR.instances["pageEditor"];
	var editor = ed.document;
	var elem = editor.$.getElementsByTagName("page");
	$.each(elem, function(index,el) {
		el.setAttribute('layout', e.target.value);
	}.bind(this));

	window.onlyUpdate=true;
	window.executingFlow=false;
	window.storePageInfo();
	window.onlyUpdate=false;

	window.forceParse=true;
	ed.fire("change");
	//window.forceParse=false;
	//setTimeout(window.storePageInfo,0);
    },

    activate: function () {
	var status = "active";
	this.saveSettings(status);
    },

    deactivate: function () {
	var status = "deleted";
	this.saveSettings(status);
    },

    highlightElements: function(target) {
	var ed = CKEDITOR.instances["pageEditor"];
	var editor = ed.document;
	var pages = editor.$.getElementsByTagName("page");

	var pageData = this.props.pageData;
	if(target.checked) {
		this.setState({highlightElements:true});
		$.each(pages, function(index,page) {
			$(page).find("*").each(function(i, el) {
				var color = '#'+Math.floor(Math.random()*16777215).toString(16);
				$(el).css("background-color", color);
				$(el).css("opacity",'0.8');
			});
		});
	} else {
		this.setState({highlightElements:false});
		$.each(pages, function(index,page) {
			$(page).find("*").each(function(i, el) {
				$(el).css("background-color",'');
				$(el).css("opacity",'');
			});
		});
	}
    },

    /* Parent state aliases */
    popup: function(message,type) {
	this.props.popup(message,type);
    },

    setPropState: function(payload, loc) {
	if(typeof loc === 'undefined')
		loc = 'workbench';

	this.props.setPropState(payload, loc);
    },

    selectItem: function (e) {
        this.setState({
            selectedItem: e.target.value
        });
	this.props.fetchItem(e.target.value);
	this.setPropState({itemId:e.target.value});
    },

    setPageState: function(payload) {
	window.pages = payload;
	this.setState(payload);
    },

    storageWorkerSaveTemplate: function(callback) {
	callback = callback || function() {};

	this.setPropState({saving: true, needSave: false});
	try {
	    var html = CKEDITOR.instances.pageEditor.document.getBody().getHtml();
	    var header = CKEDITOR.instances.headerEditor.document.getBody().getHtml();
	    var footer = CKEDITOR.instances.footerEditor.document.getBody().getHtml();

	    if('TextEncoder' in window) {
		var buf = new TextEncoder('utf-8').encode(html);
		var head = new TextEncoder('utf-8').encode(header);
		var foot = new TextEncoder('utf-8').encode(footer);
	    } else {
		var buf = new TextEnc.TextEncoder('utf-8').encode(html);
		var head = new TextEnc.TextEncoder('utf-8').encode(header);
		var foot = new TextEnc.TextEncoder('utf-8').encode(footer);
	    }
	}catch(e) {}
	
	var templateObj = {
		id: this.props.templateId,
		loc: window.location.origin,
		tok: $('meta[name="_token"]').attr('content'),
            	app_id: this.props.app_id,
            	callback: callback.toString(),
            	appFieldId: this.props.appFieldId,
		templateTitle: this.props.templateTitle,
		orientation: this.props.pageData.orientation.toLowerCase(),
		pageType: this.props.pageData.pageType,
		marginTop: this.props.pageData.marginTop,
		marginBottom: this.props.pageData.marginBottom,
		marginLeft: this.props.pageData.marginLeft,
		marginRight: this.props.pageData.marginRight,
	};
	//console.log(templateObj);
	var data = {'template': buf.buffer, 'header': head.buffer, 'footer': foot.buffer, 'cmd':'saveTemplate', 'data': templateObj };
	this.state.storageWorker.postMessage(data, [data.template, data.header, data.footer]);
    },

    saveTemplate: function(callback) {
	this.props.saveTemplate(callback);
    },

    devLog: function(log) {
	if(!window.isLocal)
		return;

	var el = $("#devConsole");

	var html = el.html();
	html += "<pre>";
	this.setPropState({devPills: (parseInt(this.props.devPills)+1)});

	if(typeof log === "object")
		log = JSON.stringify(log, null, 2);

	el.html(html+log+"</pre><hr />");
    },

    timerSelect: function(e) {
	this.setPropState({saveTime: e.target.value});
	var data = {cmd:'autoSaveTimer', data:{timeout: e.target.value}};
	this.state.storageWorker.postMessage(data);
    },

    updatePreviewImage: function() {
	var data = {cmd:'updatePreviewImage', data:{id: this.props.templateId, loc: window.location.origin, tok: $('meta[name="_token"]').attr('content')}};
	this.state.storageWorker.postMessage(data);
    },

    componentDidMount: function() {
	var data = {cmd:'autoSaveTimer', data:{timeout: this.props.saveTime}};
	this.state.storageWorker.postMessage(data);

      	$(this.refs['highlightElements'].getDOMNode() 
	).bootstrapToggle({
		on: "",
		off: "",
		size: 'mini',
		height: '20px',
		onstyle: 'success',
		offstyle: 'warning'
	}).change(function(e) {
		this.highlightElements(e.target);
	}.bind(this));

	if(this.state.highlightElements)
		$(this.refs['highlightElements'].getDOMNode()).bootstrapToggle('On');

	this.setPropState({consoleReady: true});
	this.state.storageWorker.onmessage = this.onStorageMessage;
    },

    render: function() {
        return (
                <div className="container-fluid" id="workbench">
		  <div className="row">
                    <div className="col-lg-7 col-md-9 col-sm-9 col-lg-offset-2 col-md-offset-0 col-sm-offset-0">
                        <Editor
                            pageData={this.props.pageData}
                            pageCount={this.props.pageCount}
                            items={this.props.items}
                            itemId={this.props.itemId}
                            appId={this.props.appId}
                            template={this.props.template}
                            templateId={this.props.templateId}
                            templateText={this.props.templateText}
                            templateHeader={this.props.templateHeader}
                            templateFooter={this.props.templateFooter}
                            fields={this.props.fields}
                            fieldValues={this.props.fieldValues}
                            appFieldId={this.props.appFieldId}
                            appFields={this.props.appFields}
                            templateTitle={this.props.templateTitle}
                            refreshPreview={this.props.refreshPreview}
                            org={this.props.org}
                            app={this.props.app}
                            workspace={this.props.workspace}
                            saving={this.props.saving}
                            needSave={this.props.needSave}
                            executingFlow={this.props.executingFlow}
                            undoCount={this.props.undoCount}
                            saveIcon={this.props.saveIcon}
                            refreshIcon={this.props.refreshIcon}
                            documentFlowControl={this.props.documentFlowControl}
    			    updatePreviewImage={this.updatePreviewImage}
	    		    marginTop={this.state.marginTop}
	    		    marginBottom={this.state.marginBottom}
	    		    marginLeft={this.state.marginLeft}
	    		    marginRight={this.state.marginRight}
	    		    storageWorkerSaveTemplate={this.storageWorkerSaveTemplate}

                            pages={this.state.pages}
                            setPropState={this.setPropState}
                            setPageState={this.setPageState}
                            saveTemplate={this.saveTemplate}
                            popup={this.popup}
                            fetchItem={this.fetchItem}
                            ref="editor" 
			/>
                    </div>
                    <div className="col-lg-3 col-md-3 col-sm-3">
			<div className="panel-group" id="accordion">

			  <div className={window.isLocal ? "panel panel-default" : "hidden"}>
			    <div className="panel-heading">
			      <h4 className="panel-title">
			        <a data-toggle="collapse" data-parent="#accordion" href="#devcon">
			          Dev Console &nbsp; <span className="badge" style={{position:'absolute', top:'3px'}}>{this.props.devPills}</span>
				</a>
			      </h4>
			    </div>
			    <div id="devcon" className="panel-collapse collapse">

                        	<div className="panel-body fixed-panel">
				  <pre>LocalStorage<br />{JSON.stringify(localStorage, null, 2)}</pre>
                        	</div>
                        	<div className="panel-body fixed-panel">
				  <pre>this.state<br />{JSON.stringify(this.state, null, 2)}</pre>
                        	</div>
                        	<div className="panel-body fixed-panel">
				  <pre>this.props<br />{JSON.stringify(this.props, null, 2)}</pre>
                        	</div>
                        	<div className="panel-body fixed-panel">
				  <div id="devConsole" style={{display:'block', whiteSpace:'pre-wrap'}}> </div>
                              	  </div>

			    </div>
			  </div>

			  <div className="panel panel-default">
			    <div className="panel-heading">
			      <h4 className="panel-title">
			        <a data-toggle="collapse" data-parent="#accordion" href="#docstats">
			          Statistics
				</a>
			      </h4>
			    </div>
			    <div id="docstats" className="panel-collapse collapse">

			      <div className="panel-body" style={{maxHeight: '900px'}}>
                                  <label htmlFor="numPages" className="col-lg-3 col-md-3 col-sm-2 control-label">Pages</label>
                                    <div className="col-lg-9 col-md-7 col-sm-5" id="numPages">
					{this.state.pages.length}
                                    </div>
			      </div>

			      <div className="panel-body" style={{maxHeight: '900px'}}>
                                  <label htmlFor="numPrints" className="col-lg-3 col-md-3 col-sm-2 control-label">Prints</label>
                                    <div className="col-lg-9 col-md-7 col-sm-5" id="numPages">
					{this.props.template.print_count}
                                    </div>
			      </div>

			    </div>
			  </div>

			  <div className="panel panel-default">
			    <div className="panel-heading">
			      <h4 className="panel-title">
			        <a data-toggle="collapse" data-parent="#accordion" href="#docsettings">
			          Document Settings
				</a>
			      </h4>
			    </div>
			    <div id="docsettings" className="panel-collapse collapse">
			      <div className="panel-body" style={{maxHeight: '1200px'}}>

                                <div className="row">
                                <div className="form-group">
                                  <label htmlFor="title" className="col-lg-3 col-md-3 col-sm-2 control-label" >Title</label>
                                  <div className="col-lg-9 col-md-7 col-sm-5">
                                    <input type="text" className="form-control" id="title" placeholder={this.props.template.title} value={this.stateTitle} onChange={this.renderTitleChange}></input>
                                  </div>
                                </div>
                                </div>

                                <div className="row">
                                <div className="form-group">
                                  <label htmlFor="pagetype" className="col-lg-3 col-md-3 col-sm-2 control-label">Page Size</label>
                                    <div className="col-lg-9 col-md-7 col-sm-5">
                                      <select onChange={this.pageTypeSelect} className="form-control" value={ (this.props.pageData.pageType) ? this.props.pageData.pageType : ''} id="pagetype">
                                	{this.state.pageTypes.map( (item) => {
                                	  return (
                                	    <option key={item.id} value={item.name}>{item.name}</option>
                                	  )
                               	 	})}
                                      </select>
                                    </div>
                                </div>
                                </div>

                                <div className="row">
                                <div className="form-group">
                                  <label htmlFor="orientation" className="col-lg-3 col-md-3 col-sm-2 control-label">Page Layout</label>
                                    <div className="col-lg-9 col-md-7 col-sm-5">
                                      <select onChange={this.orientationSelect} className="form-control" value={this.props.pageData.orientation.toLowerCase()} id="orientation">
                                	{this.state.orientations.map( (item) => {
                                  	  return (
                                	    <option key={item.id} value={item.name}>{item.name}</option>
                                	  )
                                	})}
                                      </select>
                                    </div>
                                </div>
                                </div>

                                <div className="row">
                                    <div className="form-group">
                                    <label className="col-lg-3 col-md-3 col-sm-3 control-label">Page Margins</label>
					<div className="col-lg-4 col-md-4 col-sm-4">
						<input type="number" style={{maxLength: '3', width:'40px'}} maxlegnth="3" id="marginTop" name="margin-top" onChange={this.updateMargin} placeholder={this.props.pageData.marginTop} value={this.props.pageData.marginTop} onBlur={this.changeMargin} /> px Top<br />
						<input type="number" style={{maxLength: '3', width:'40px'}} maxlegnth="3" id="marginBottom" name="margin-bottom" onChange={this.updateMargin} placeholder={this.props.pageData.marginBottom} value={this.props.pageData.marginBottom} onBlur={this.changeMargin} /> px Bottom
					</div>
					<div className="col-lg-4 col-md-4 col-sm-4">
						<input type="number" style={{maxLength: '3', width:'40px'}} maxlegnth="3" id="marginLeft" name="margin-left" onChange={this.updateMargin} placeholder={this.props.pageData.marginLeft} value={this.props.pageData.marginLeft} onBlur={this.changeMargin} /> px Left<br />
						<input type="number" style={{maxLength: '3', width:'40px'}} maxlegnth="3" id="marginRight" name="margin-right" onChange={this.updateMargin} placeholder={this.props.pageData.marginRight} value={this.props.pageData.marginRight} onBlur={this.changeMargin} /> px Right
					</div>
                            	    </div>
                            	</div>

                                <div className="row">
                                <label className="col-lg-12 col-md-12 col-sm-12 control-label"></label>
                                <div className="form-group">
                                	<label htmlFor="save" className="col-sm-3 control-label">Save Settings</label>
                                        <div className="col-sm-7">
                                        	<button title="Save Settings" className="btn btn-primary" onClick={this.saveSettings}>
                                        		<i className="fa fa-floppy-o fa-lg"></i>
                                        	</button>
                                        </div>
                                	<label className="col-lg-12 col-md-12 col-sm-12 control-label"></label>
                                        <label htmlFor="item-select" className="col-sm-3 control-label">Activate</label>
                                        <div className="col-sm-3 center-align">
                                                <button title="Create Podio print button" className="btn btn-success" onClick={this.activate}>
                                                        <i className="fa fa-plus fa-lg"></i>
                                                </button>
                                        </div>
                                        <label htmlFor="item-select" className="col-sm-3 control-label">Deactivate</label>
                                        <div className="col-sm-3 center-align">
                                                <button title="Delete Podio print button" className="btn btn-danger" onClick={this.deactivate}>
                                                        <i className="fa fa-minus fa-lg"></i>
                                                </button>
                                        </div>
                                </div>
                                </div>

                                <div className="row">
                                <label className="col-lg-12 col-md-12 col-sm-12 control-label"></label>
                                <div className="form-group">
                                        <label htmlFor="item-select" className="col-sm-3 control-label">Items</label>
                                        <div className="col-sm-9">
                                        	<select onChange={this.selectItem} className="form-control" value={this.props.itemId}>
                                                	<option value="none">Select an item</option>
                                                        {this.props.items.map( (item) => {
                                                        	return (
                                                                	<option key={item.item_id} value={item.item_id}>{item.title} (Item ID# {item.item_id})</option>
                                                                )
                                                	})}
                                                </select>
                                        </div>
                                </div>
                                </div>

                                <div className="row">
                                <label className="col-lg-12 col-md-12 col-sm-12 control-label"></label>
                                <div className="form-group">
                                	<label htmlFor="save" className="col-sm-3 control-label">Download</label>
                                        <div className="col-sm-3">
                                                <button title="Download a PDF" className="btn btn-default" onClick={this.printWithItem}>
                                                        <i className="fa fa-download fa-lg"></i>
                                                </button>
					</div>
                                        <label htmlFor="save" className="col-sm-3 control-label">Upload</label>
					<div className="col-sm-3">
                                        	<button title="Upload to Podio" className="btn btn-success" onClick={this.uploadToPodio}>
                                                        <i className="fa fa-cloud-upload fa-lg"></i>
                                                </button>
                                        </div>
                                </div>
                                </div>
			      </div>
			    </div>
			  </div>

			  <div className="panel panel-default">
			    <div className="panel-heading">
			      <h4 className="panel-title">
			        <a data-toggle="collapse" data-parent="#accordion" href="#pagesettings">
			          Page Settings
				</a>
			      </h4>
			    </div>
			    <div id="pagesettings" className="panel-collapse collapse">
			      <div className="panel-body" style={{maxHeight: '900px', overflowX: 'auto'}}>
				<div style={{ float:'right', width:'40%'}}>
				    <img id="preview-image" src={"/template/"+this.props.templateId+"/image/"+this.props.templateId+".jpg"} style={{width: '150px'}}/>
			        </div>

				<div style={{ float:'left', width:'55%', paddingTop:'6px' }}>
                                {this.state.pages.map( (page, index) => {
                                	return (
				    		<div key={index} style={{  width:'100%', height:'170px', wordWrap: 'break-word', marginTop:'3.5px'}}>
						    <p style={{ textAlign:'center' }}><strong>Page: {(index+1)}</strong></p>
						    <div>{page.imported ? 'Flow Control Off' : 'Flow Control On'}</div>
						    <div style={{ paddingTop:'1px' }}>Size: {page.size}</div>
						    <div style={{ paddingTop:'1px' }}>Layout: {page.layout}</div>
						    <div style={{ paddingTop:'1px' }}>Top Margin: {page.marginTop}</div>
						    <div style={{ paddingTop:'1px' }}>Bottom Margin: {page.marginBottom}</div>
						    <div style={{ paddingTop:'1px' }}>Left Margin: {page.marginLeft}</div>
						    <div style={{ paddingTop:'1px' }}>Right Margin: {page.marginRight}</div>
						</div>
                                	)
                                })}
				</div>
			      </div>
			    </div>
			  </div>

			  <div className="panel panel-default">
			    <div className="panel-heading">
			      <h4 className="panel-title">
			        <a data-toggle="collapse" data-parent="#accordion" href="#editorsettings">
			          Editor Settings
				</a>
			      </h4>
			    </div>
			    <div id="editorsettings" className="panel-collapse collapse">
			      <div className="panel-body" style={{maxHeight: '900px'}}>

                                <div className="form-group">
                                  <label htmlFor="saveTime" className="col-lg-7 col-md-7 col-sm-7 control-label">Auto Save Timer</label>
                                    <div className="col-lg-5 col-md-5 col-sm-5">
                                      <select onChange={this.timerSelect} className="form-control" value={this.props.saveTime} id="saveTime">
                                	{this.state.saveTimers.map( (item, index) => {
                                  	  return (
                                	    <option key={index} value={item.value}>{item.name}</option>
                                	  )
                                	})}
                                      </select>
                                    </div>
                                </div>

                                <div>
                                </div>

                                <div className="form-group">
                                      {this.state.pageFeatures.map( (item, index) => {
                                	return (
                                    	<div>
                                  	  <label htmlFor={item.name} className="col-lg-9 col-md-9 col-sm-9 control-label">{item.title}</label>
                                    	  <div className="col-lg-3 col-md-3 col-sm-3">
					    <div className="make-switch" key={index}>
                                	      <input ref={item.name} id={item.name} type="checkbox" key={item.id} name={item.name} checked={this.state.hightlightElements} />
					    </div>
                                    	  </div>
                                    	</div>
                                	)
                                      })}
                                </div>

			      </div>
			    </div>
			  </div>

			</div>
                    </div>
                  </div>
                </div>
        );
    }
});

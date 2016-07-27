var _ = require("lodash");
var getFieldValuesList = require("./getFieldValuesList.js");

module.exports = function (self) {
    self.addEventListener('message',function (event){
	var message = event.data;
	var app, org, workspace,
	relationshipFields, itemRefs;

	//console.groupCollapsed("Field Worker CMD: "+message.cmd);
	//console.log(message);

	var Twix = (function () {
	    function Twix() { }
    
	    Twix.ajax = function(options) {
	        options = options || {url:""};
	        options.type = options.type.toUpperCase() || 'GET';
	        options.headers = options.headers || {};
	        options.timeout = parseInt(options.timeout) || 0;
	        options.success = options.success || function() {};
	        options.error = options.error || function() {};
        	options.async = typeof options.async === 'undefined' ? true : options.async;

	        var client = new XMLHttpRequest();
        	if (options.timeout > 0) {
        	    client.timeout = options.timeout;
        	    client.ontimeout = function () { 
        	        options.error('timeout', 'timeout', client); 
        	    }
        	}
        	client.open(options.type, options.url, options.async);

        	for (var i in options.headers) {
        	    if (options.headers.hasOwnProperty(i)) {
        	        client.setRequestHeader(i, options.headers[i]);
        	    }
        	}
        
        	client.send(options.data);
        	client.onreadystatechange = function() {
        	    if (this.readyState == 4 && this.status == 200) {
        	        var data = this.responseText;
        	        var contentType = this.getResponseHeader('Content-Type');
        	        if (contentType && contentType.match(/json/)) {
                	    data = JSON.parse(this.responseText);
                	}
                	options.success(data, this.statusText, this);
	            } else if (this.readyState == 4) {
	                options.error(this.status, this.statusText, this);
	            }
	        };
	
	        if (options.async == false) {
	            if (client.readyState == 4 && client.status == 200) {
        	        options.success(client.responseText, client);
	            } else if (client.readyState == 4) {
        	        options.error(client.status, client.statusText, client);
            	}
        	}	 

        	return client;
	    };
    
	    Twix.get = function(url, data, callback) {
	        if (typeof data === "function") {
	            callback = data;
	            data = undefined;
	        }
	        
	        return Twix.ajax({
	            url: url,
	            data: data, 
	            success: callback
	        });
	    };
	    
	    Twix.post = function(url, data, callback) {
	        if (typeof data === "function") {
	            callback = data;
	            data = undefined;
	        }
	        
	        return Twix.ajax({
	            url: url,
	            type: 'POST',
	            data: data, 
	            success: callback
	        });
	    };
	    
	    return Twix;
	})();

    	function setupOutgoing() {
        	let items = [];
        	let tmprelationshipFields = relationshipFields;
        	for (let i = 0; i < tmprelationshipFields.length; i++) {
        	    //this.devLog(relationshipFields[i])
        	    let relationshipFieldExternalId = tmprelationshipFields[i].external_id;
        	    for (let j = 0; j < tmprelationshipFields[i].values.length; j++) {
        	        items.push({
        	            field_external_id: relationshipFieldExternalId,
        	            item_id: tmprelationshipFields[i].values[j].value.item_id
        	        })
        	    }
        	}
  		postMessage({'cmd':'setState','data': {
        		'items_out': items
		}});
    	}
    	function setupIncoming() {
        	let items = [];
        	let tmpitemRefs = itemRefs;
        	for (let i = 0; i < tmpitemRefs.length; i++) {
        	    items.push({
        	        item_id: tmpitemRefs[i].item_id
        	    })
        	}
  		postMessage({'cmd':'setState','data': {
        		'items_in': items
		}});
    	}
	switch(message.cmd) {
		case 'setupFields':
        		let fields = _.filter(message.fields, (a) => {
       			     return a.status === "active" && a.config.label !== "APT Template" && a.config.label !== "APT Templates";
        		})
			var data = {'rel_fields':fields};
			//console.log(data);
			//console.groupEnd();
  			postMessage({'cmd':message.cmd,'data':data});
		    break;
		case 'getPodioAppInfo':
        		Twix.ajax({
				type: "GET",
			        url: message.loc+"/podio/app/" + message.app_id,
				success: function(data) {
			        	app = data;
  					postMessage({'cmd':'setAppData','data':app});
			        	Twix.ajax({
			        		type: "GET",
			                	url: message.loc+"/podio/workspace/" + app.space_id,
						success: function(data) {
                        				workspace = data;
  							postMessage({'cmd':'setWorkspaceData','data':workspace});
                    					Twix.ajax({
			                		       	type: "GET",
			                		       	url: message.loc+"/podio/organization/" + workspace.org_id,
								success: function(data) {
                							org = data;
  									postMessage({'cmd':'setOrgData','data':org});
									//console.groupEnd();
			                			}
							})
			        		}
					})
				}
			 });
			//console.groupEnd();
		    break;
		case 'fetchItem':
                Twix.ajax({
                    type: 'GET',
                    url: message.loc+'/podio/item/' + message.itemId + '/values',
		    success: function(data) {
			for(var key in data) {
				  if (data.hasOwnProperty(key)) {
                    	    		data[key] = JSON.parse(data[key]);
				  }
                    	}
                        relationshipFields = _.filter(data, (d) => d.type === "app");
  		    	postMessage({'cmd':'setState','data': {
                    	    'fieldValues': getFieldValuesList(data),
                    	    'relationshipFields': relationshipFields
                    	}});
                    	Twix.ajax({
                    	        type: "GET",
                    	        url: message.loc+"/podio/item/" + message.itemId + "/reference",
                    	    	success: function(data) {
                    	          if(data.length > 0) {
				    itemRefs = data[0]['items'];
  		    		    postMessage({'cmd':'setState','data': {
				  	    'itemRefs': data[0]['items'], 
					    'prefetchedRelationships':true
				   	 }});
				    //console.groupEnd();
                       	          } else {
				    itemRefs = [];
  		    		    postMessage({'cmd':'setState','data': {
                                	    'itemRefs': [],
                                	    'prefetchedRelationships': true
					}});
                            	  }
			    	  setupIncoming();
			    	  setupOutgoing();
				  //console.groupEnd();
                        	}
                    	})
		      }
		    });
			//console.groupEnd();
		    break;
	//console.groupEnd();
	}
	//console.groupEnd();
    });
    self.addEventListener('error',function (event){
	//console.log("Field Worker Error:");
	//console.log(event);
    });

};

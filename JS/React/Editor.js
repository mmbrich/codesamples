import Toolbar from './Toolbar.js';

var React = require('react');
var work = require('webworkify');
var TextEnc = require("text-encoding");

export default React.createClass({

    getInitialState: function () {
        return {
		previousOffset: 0,
		transferThrottleCap: 5,
		transferThrottleCurrent: 0,
		typing: false,
		executing: false,
		justOverflowed: false,
		justUnderflowed: false,
		editorReady: false,
		pagesLoaded: false,
		mutationObservers: true,
		observer: null,
		observerConfig: { attributes: true, attributeOldValue: true, childList: true, characterData: true, subtree: true, characterDataOldValue: true },
	    	parseWorker: work(require('../../workers/WebWorkerParseEditor.js'))
        }
    },

    insert: function (text) {
	var oEditor = CKEDITOR.instances.pageEditor;
	oEditor.insertText("${"+text+"}");
    },

    insertHardFetch: function(text) {
	var oEditor = CKEDITOR.instances.pageEditor;
	oEditor.insertText("#{"+text+"}");
    },

    insertImageRelated(text,width,height) {
	this.insertImage("${"+text+"}",width,height);
    },

    insertImageHardFetch(text,width,height) {
	this.insertImage("#{"+text+"}",width,height);
    },

    insertImage: function(text, width, height) {
	var oEditor = CKEDITOR.instances.pageEditor;
	var html = '<img alt="TECHeGO Print Variable" src="'+text+'" style="width:'+width+';height:'+height+';" />';
	var newElement = CKEDITOR.dom.element.createFromHtml( html, oEditor.document );
	oEditor.insertElement( newElement );
    },

    insertCondition: function() {
	var oEditor = CKEDITOR.instances.pageEditor;
	var html = '<p>${if' + '(<insert_variable_to_check>)' + '} <insert_conditional_text> ${endif}</p>';
	var newElement = CKEDITOR.dom.element.createFromHtml( html, oEditor.document );
	oEditor.insertElement( newElement );
    },

    onParseMessage: function(e) {
	var message = e.data;
	if(message.cmd == 'pageObj') {
		this.setPropState({pageData: message.data.pageObj});
	}
	if(this.state.mutationObservers)
		return;

	if(message.cmd == 'underflow') {
		this.parseDocumentUnderflow(parseInt(message.page));
	}
	if(message.cmd == 'overflow') {
		if(!message.inject) {
		    this.parseDocumentOverflow(parseInt(message.page+1));
		}
		if(message.inject) {
			if(CKEDITOR.instances.pageEditor.execCommand('injectblank', false, null)) {
				this.parseDocumentOverflow(parseInt(message.page+1));
				setTimeout(this.updateMargins,0);
			}
		}
	}
    },

    onParseError: function(e) {
	//console.log(e.message);
    },

    setupWorkers: function() {
	this.state.parseWorker.onmessage = this.onParseMessage;
    },

    absoluteListeners: function(el) {
	var thisEl = new CKEDITOR.dom.node(el);
	thisEl.removeAllListeners();
	$(el).attr("draggable","true");
	$(el).attr("dropable","false");
	$(el).css("cursor","pointer");

	thisEl.on( 'mousedown', function( evt ) {
		window.offsetY = evt.data.$.offsetY;
		window.offsetX = evt.data.$.offsetX;
		var selection = new CKEDITOR.dom.selection(this);
		//var myPage = $(this.$).parents("page");
		//selection.reset();
		selection.selectElement(this);
	});
	thisEl.on( 'dragstart', function( evt ) {
		var target = evt.data.getTarget().getAscendant( 'p', true );
		if(!target)
			var target = evt.data.getTarget().getAscendant( 'div', true );

		if(!target)
			return;

		CKEDITOR.plugins.clipboard.initDragDataTransfer( evt );

		var dataTransfer = evt.data.dataTransfer;
		dataTransfer.setData("text/html", target.getText() );
	})
    },

    dragDropListen: function() {
	var oEditor = CKEDITOR.instances.pageEditor;
	$(oEditor.document.$).find('div.pagecontent').each(function(i,el) {
		$(el).attr("dropable","true");
		$(el).attr("onDrop",this.dropListener);
	}.bind(this));

	var els = $(oEditor.document.$).find('p[style*="absolute"], div[style*="absolute"]');
	$.each(els, function(i,el) {
		this.absoluteListeners(el);
	}.bind(this));
    },

    updateMargins: function() {
	if(!this.state.editorReady || !this.state.pagesLoaded)
		return;

	console.log("Updating Margins");
	var ed = CKEDITOR.instances["pageEditor"];
	var editor = ed.document;
	var pages = editor.$.getElementsByTagName("page");

	for(let i = 0; (i+1) <= pages.length;i++) {
		var page = pages[i];
		if(this.props.pages[i]) {
			var hHeight = parseInt(this.props.pages[i].headerHeight);
			var fHeight = parseInt(this.props.pages[i].footerHeight);
		} else {
			var hHeight = 0;
			var fHeight = 0;
		}

		if( typeof $(page).data("imported") !='undefined' && $(page).data("imported") ) {
			var lMargin=0;
			var rMargin=0;
			var tMargin=0;
			var bMargin=0;
			hHeight = 0;
			fHeight = 0;
		} else {
			var lMargin = this.props.pageData.marginLeft
			var rMargin = this.props.pageData.marginRight;
			var tMargin = this.props.pageData.marginTop;
			var bMargin = this.props.pageData.marginBottom;
			hHeight = (parseInt(hHeight)+parseInt(tMargin));
			fHeight = (parseInt(fHeight)+parseInt(bMargin));
		}
		var wid = (parseInt(rMargin) + parseInt(lMargin));

		let pageContent = page.getElementsByClassName("pagecontent")[0];
		$(pageContent).css( 'margin-left', lMargin+'px' );
		$(pageContent).css( 'margin-right', rMargin+'px' );
		$(pageContent).css('width', 'calc(100% - '+wid+'px)');

		let headerContent = page.getElementsByClassName("headercontent")[0];
		$(headerContent).css( 'margin-top', tMargin+'px' );
		$(headerContent).css( 'margin-left', lMargin+'px' );
		$(headerContent).css( 'margin-right', rMargin+'px' );
		$(headerContent).css('width', 'calc(100% - '+wid+'px)');

		let footerContent = page.getElementsByClassName("footercontent")[0];
		$(footerContent).css( 'margin-bottom', bMargin+'px' );
		$(footerContent).css( 'margin-left', lMargin+'px' );
		$(footerContent).css( 'margin-right', rMargin+'px' );
		$(footerContent).css('width', 'calc(100% - '+wid+'px)');

		let contents = page.getElementsByClassName("content")[0];
		$(contents).css('top', hHeight);
		$(contents).css('bottom', fHeight);
	}
    },

    removePage: function(pIndex) {
	if(pIndex == 0) return; //not removing last page

	//console.log("Removing: "+pIndex);
	var oEditor = CKEDITOR.instances.pageEditor;
	var pages = oEditor.document.$.getElementsByTagName("page");
        var page = pages[pIndex];
        var totalPages = pages.length;
        $(page).remove();

        if(parseInt(totalPages) > parseInt(pIndex)) {
                for(var pindex = pIndex; (pindex+1) < totalPages; pindex++) {
        		var page = pages[pindex];
        		$(page).data('pagenum', (parseInt(pindex)+1));
        		$(page).attr('data-pagenum', (parseInt(pindex)+1));
                }
        }
	setTimeout(this.storePageInfo,0);
    },

    parseDocumentOverflow: function(pageNum) {
	console.groupCollapsed("Overflow: "+pageNum);
	if(this.state.justUnderflowed) {
		console.log("Leaving");
		console.groupEnd();
		this.setState({justUnderflowed:false});
		//this.setState({justOverflowed:false});
		//return;
	}
	this.setState({justOverflowed: true});
	var currentPage = pageNum;
	var currentIndex = (pageNum-1);
	var pageIndex = currentIndex;
	var oEditor = CKEDITOR.instances.pageEditor;
	var pages = oEditor.document.$.getElementsByTagName("page");
	var thePage = pages[currentIndex];
	var thisPage = new CKEDITOR.dom.node(thePage);
	var nextPage = new CKEDITOR.dom.node(pages[(currentIndex+1)]);
	if(typeof thisPage.$ == 'undefined' || typeof thisPage.$ == 'null') {
		console.log("No Page");
		console.groupEnd();
		return;
	}
	console.log(nextPage);

	var lastEl = $(thePage.getElementsByClassName('pagecontent')[0])[0];

	try {
		var maxHeight = this.props.pages[pageIndex].maxHeight;
		var currentHeight = parseInt($(lastEl)[0].scrollHeight);
	} catch(e) {
		console.groupEnd();
		return;
	}

	var ph = $(lastEl)[0].clientHeight;
	var range = new CKEDITOR.dom.range(oEditor.document);

	try {
		var target = oEditor.getSelection().getStartElement();
	} catch(e) {target = null;}
	var isTarget = false;

	var pageElements = $(lastEl).find("*");
	var i = (pageElements.length - 1);
	while(parseInt(currentHeight) > maxHeight) {
		if(typeof currentHeight === undefined || !currentHeight) {
			console.log("no current height");
			console.groupEnd();
			return;
		}
		var element = pageElements[i];
		var elementHeight = $(element)[0].clientHeight;
		try {
			if(typeof target.$ == 'null')
			        isTarget = false;
			else {
				if( $(target.$).is( $(element)[0] ) )
				    isTarget = true;
			}
		} catch(e) {var isTarget=false;}

		try {
			//currentHeight = (parseInt($(element)[0].clientHeight) - parseInt(currentHeight));
			//$(element)[0].parentNode.removeChild($(element)[0]);
			$(nextPage.$.getElementsByClassName('pagecontent')[0]).prepend($(element)[0]);
			currentHeight = parseInt($(lastEl)[0].scrollHeight);
			console.log("Moved Content");
			console.log($(element)[0]);
		} catch(e) {
			/* nextPage gone */
			console.log("Couldnt Move"); 
			console.groupEnd();
			return;
		}

		if(isTarget) {
			range.moveToElementEditablePosition(new CKEDITOR.dom.node($(element)[0]), true);
			oEditor.getSelection().selectRanges([range]);
		}
		if(i == 0 || maxHeight >= currentHeight) {
			//out of elements or while loop should have broke
			//console.log("Out of elements? "+i);
			console.groupEnd();
			return;
		}
		i--;
	}
	console.groupEnd();
	if(typeof pages[(parseInt(currentIndex)+1)] == 'object')
		this.parseDocumentOverflow((parseInt(currentIndex)+1));
    },

    parseDocumentUnderflow: function(pIndex) {
	if(this.state.justOverflowed) {
		console.log("Leaving");
		console.groupEnd();
		this.setState({justOverflowed: false});
		this.setState({justUnderflowed:false});
		return;
	}
	this.setState({justUnderflowed:true});
	console.groupCollapsed("underflow: "+(pIndex+1));
	var thisIndex = pIndex;
	var oEditor = CKEDITOR.instances.pageEditor;
	var pages = oEditor.document.$.getElementsByTagName("page");
	var thisParent = $(pages[pIndex]).find("div.pagecontent");
	thisParent = new CKEDITOR.dom.node( thisParent[0] );

	if(typeof pages[(thisIndex+1)] === undefined || typeof pages[(thisIndex+1)] == 'undefined') {
		console.log("no page to pull underflow from");
		this.setState({justOverflowed: false});
		console.groupEnd();
		return;
	}

	try {
		var nextPage = new CKEDITOR.dom.node( $(pages[(thisIndex+1)]).find("div.pagecontent")[0] );
		var tmp = $($(nextPage.$)[0].firstElementChild)[0].clientHeight;
	} catch(e) {
		// Blank page
		console.log(e);
		console.log("No next page elements");
		console.groupEnd();
		if(typeof pages[(pIndex+1)] == 'object')
			this.parseDocumentUnderflow((pIndex+1));
		return;
		//this.removePage(pIndex);
	}

	try {
	var numElements = $(nextPage.$).find("*").length;
	var oldHeight = this.props.pages[thisIndex].clientHeight;
	var newHeight = thisParent.$.clientHeight;
	var offset = (oldHeight - newHeight);
	var childHeight = $($(nextPage.$)[0].firstElementChild)[0].clientHeight;
	var count=0;
	var maxHeight = this.props.pages[thisIndex].maxHeight;
	}catch(e) {console.log(e);return;}

	if(numElements == 0) {
		/* blank next page */
		console.log("Page out of elements - removing page"); 
		console.groupEnd();
		this.removePage((thisIndex+1));
		return;
	}
	while( (newHeight+childHeight) <= maxHeight ) {
		//console.log("underflow, appending: ");
		try {
			childHeight = $($(nextPage.$)[0].firstElementChild)[0].clientHeight;
		} catch (e) {
			console.log(e);
			break;
		}

		try {
			console.log("New Height :"+(parseInt(thisParent.$.clientHeight) + parseInt(childHeight)));
			if((parseInt(thisParent.$.clientHeight) + parseInt(childHeight)) > maxHeight) {
				console.log("Leaving");
				break;
			}

			$(thisParent.$).append( $(nextPage.$)[0].firstElementChild );
			newHeight = thisParent.$.clientHeight;
		}catch(e){console.log(e);return;}

		if(numElements == 0 || count == 100) {
			break; 
		}
		count++;
		numElements--;
	}
	if(typeof pages[(parseInt(pIndex)+1)] == 'object')
		this.parseDocumentUnderflow((parseInt(pIndex)+1));

	console.groupEnd();
    },

    documentPositionControl: function(pageNum) {
	//console.log("Handling caret position - Page: "+pageNum);
	var currentPage = pageNum;
	var currentIndex = (pageNum-1);
	var oEditor = CKEDITOR.instances.pageEditor;
	var pages = oEditor.document.$.getElementsByTagName("page");
	var target = oEditor.getSelection().getStartElement();

	if(this.state.previousOffset == 0 && currentIndex > 0 && target.$.offsetTop == 0) {
		// Pointer is at the top of the document and has
		// hit the up arrow again, move to next page up!
		var range = new CKEDITOR.dom.range(oEditor.document);
		range.moveToElementEditablePosition(new CKEDITOR.dom.node( pages[(currentIndex-1)].lastElementChild ), true);
		oEditor.getSelection().selectRanges([range]);
	}
	this.setState({previousOffset: target.$.offsetTop});
    },

    pageClickListener: function(thisPage) {
	try {
	    thisPage.on("click", function(el) {
		try {
                	var target = CKEDITOR.instances.pageEditor.getSelection().getStartElement();
			var lastEl = el.sender.$.getElementsByClassName("pagecontent")[0];
			var ckEl = CKEDITOR.dom.node($(lastEl)[0]);
			ckEl.focus();

			if(this.state.mutationObservers && this.state.observer) {
				this.state.observer.disconnect();
				if(thisPage.data("imported") != "true") {
					this.state.observer.observe(lastEl, this.state.observerConfig);
				}
			}

			// Clicked in a non-editable area, move to end of
			// editable area of this page
			if(!target || !target.$.isContentEditable) {
				var range = new CKEDITOR.dom.range(ckEl);
				range.moveToElementEditablePosition(ckEl, true);
			    	CKEDITOR.instances.pageEditor.getSelection().selectRanges([range]);
			}
		} catch(e) { console.log(e); /* did we lose track of pagecontent?*/ }
	    }.bind(this));
	} catch(e) {console.log(e);}
    },

    storePageInfo: function() {
	//console.log("StorePageInfo");
	this.setPropState({executingFlow: false});

	// Get the pages from our editor
	try {
		var pages = CKEDITOR.instances.pageEditor.document.$.getElementsByTagName('page');
	} catch(e) {
		//console.log("Source Mode?");
		this.setPropState({executingFlow: false});
	 	return;
	}

	if(this.props.pageCount != pages.length)
		this.setPropState({pageCount: pages.length});

	var statePages = [];
	// overflow/underflow data
	for(var index = 0; (index+1) <= pages.length; index++) {
		var hasHeader = false;
		var hasFooter = false;
		var footerHeight = 0;
		var headerHeight = 0;
		var highlightElements = false;
		var page = pages[index];
		var thisContent = $(page.getElementsByClassName("pagecontent")[0]);

		if(page.firstElementChild.className == "header") {
			hasHeader = true;
			headerHeight = (parseInt(page.firstElementChild.clientHeight)-parseInt(this.props.pageData.marginTop));
		}
		if(page.lastElementChild.className == "footer") {
			hasFooter = true;
			footerHeight = (parseInt(page.lastElementChild.clientHeight)-parseInt(this.props.pageData.marginBottom));
		}
		if(typeof this.props.pageData.highlightElements != 'undefined')
			highlightElements = this.props.pageData.highlightElements;

		var imported = false;
		try {
		    var imported = page.getAttribute("data-imported");
		    if(!imported)
			var imported = false;
		}catch(e) {}

		if(imported) {
			var marginTop = 0;
			var marginBottom = 0;
			var marginLeft = 0;
			var marginRight = 0;
		} else {
			var marginTop = this.props.pageData.marginTop;
			var marginBottom = this.props.pageData.marginBottom;
			var marginLeft = this.props.pageData.marginLeft;
			var marginRight = this.props.pageData.marginRight;
		}

		if(parseInt(headerHeight) < 0)
			headerHeight = 0;
		if(parseInt(footerHeight) < 0)
			footerHeight = 0;

		var pageObj = {
			innerHeight: thisContent.innerHeight(),
			outerHeight: thisContent.outerHeight(),
			clientHeight: thisContent[0].clientHeight,
			scrollHeight: thisContent[0].scrollHeight,
			size: this.props.pageData.pageType,
			layout: this.props.pageData.orientation,
			hasHeader: hasHeader,
			headerHeight: parseInt(headerHeight),
			hasFooter: hasFooter,
			footerHeight: (parseInt(footerHeight)),
			parentHeight: page.offsetHeight,
			marginTop: marginTop,
			marginBottom: marginBottom,
			marginLeft: marginLeft,
			marginRight: marginRight,
			maxHeight: (parseInt(page.offsetHeight) - ((parseInt(marginTop) + parseInt(marginBottom)) + (parseInt(footerHeight) + parseInt(headerHeight))) ),
			parentScroll: page.scrollHeight,
			offset: page.offsetHeight,
			imported: imported
		};
		statePages.push(pageObj);
	};

	/* pass in our new object to checkUnderflow so it can compare */
	var data = {newStatePages:statePages};
	if(this.props.pageCount > 0 && window.onlyUpdate == false && !this.state.mutationObservers) {
		this.state.parseWorker.postMessage({'cmd':'checkUnderflow','data':data});
	}

	/* set our global and react variables */
	this.setPageState({pages: statePages});
	this.setState({pagesLoaded: true});

	/* our parser runs in a single thread.
	 * if our prior message was queued (should be)
	 * then we're good to queue this one up next 
	*/
	var data = {statePages:statePages};
	if(!window.onlyUpdate && !this.state.mutationObservers)
		this.state.parseWorker.postMessage({'cmd':'checkOverflow','data':data});

	/* Clean up */
	this.setPropState({executingFlow: false});
	window.onlyUpdate=false;
    },

    setPageState: function(payload) {
	window.pages = payload.pages
	this.props.setPageState(payload);
    },

    parsePosition: function() {
	try {
                var target = ed.getSelection().getStartElement().getParents();
		$.each(target, function(index, value) {
			if(value.getName() == "page") {
				var el = $(value.$);
				var currentPage = (parseInt(el.data("pagenum"))-1);
				this.documentPositionControl((currentPage+1));
			}
		}.bind(this));
	} catch(e) {}
    },

    extrasChange: function() {
	try {
    	    var editor = CKEDITOR.instances.pageEditor;
	    var headers = $(editor.document.$).find("div.headercontent");
	    var footers = $(editor.document.$).find("div.footercontent");

	    $.each(headers, function(index, header) {
		$(header).html(this.props.templateHeader);
	    }.bind(this));

	    $.each(footers, function(index, footer) {
		$(footer).html(this.props.templateFooter);
	    }.bind(this));
	} catch(e) {console.log(e);}

	setTimeout(this.updateMargins,0);
    },

    componentWillReceiveProps(nextProps) {
	//console.log("Props");
	//console.log(nextProps.pages);
	//console.log(nextProps.pageData);
	//console.log(nextProps.pageCount);
    },

    eventAndKeyHandler: function(key) {
	//console.log(key);
	switch(key) {
	    case 'Up':
	    case 'Down':
		if(this.state.typing) {
			this.setState({typing:false});
			if(!this.state.mutationObservers)
				setTimeout(this.storePageInfo,0);
		}

		this.parsePosition();
	    break;

	    // delete, backspace and enter
	    case 'U+007F':
	    case 'U+0008':
	    case 'Enter':
	    case 'Paste':
	    case 'Copy':
	    case 'enter':
	    case 'paste':
	    case 'copy':
		//console.log(key);
		if(this.state.typing)
			this.setState({typing:false});

		if(!this.state.mutationObservers)
			setTimeout(this.storePageInfo,0);
	    break;

	    default:
		if(!this.state.typing) {
			this.setState({typing:true});

			setTimeout(function() {
				if(this.state.typing) {
					this.setState({typing:false}); 
				}
				if(!this.state.mutationObservers)
					this.storePageInfo();
			}.bind(this),2200);
		}
	    break;
	}
    },

    getOffset: function(el) {
  	el = el.getBoundingClientRect();
  	return {
    		left: el.left + window.scrollX,
    		top: el.top + window.scrollY
  	}
    },

    setupEditor: function() {
	// trying not to overwrite $this 
	// for internal CKEdtior controls
	window.documentPositionControl=this.documentPositionControl;
	window.parseDocumentOverflow=this.parseDocumentOverflow;
	window.parseDocumentUnderflow=this.parseDocumentUnderflow;
	window.eventAndKeyHandler=this.eventAndKeyHandler;
	window.pageClickListener=this.pageClickListener;
	window.checkOverflow=this.checkOverflow;
	window.updateMargins=this.updateMargins;
	window.mutationObserver=this.mutationObserver;
	window.storePageInfo=this.storePageInfo;
	window.observerConfig=this.state.observerConfig;
	window.setPropState=this.setPropState;
	window.setState=this.setState;
	window.popup=this.popup;
	window.onlyUpdate=false;
	window.forceParse=false;
	window.pageCount=0;
	window.pages = null;
	window.executingFlow=this.props.executingFlow;

	var ed = CKEDITOR.replace( 'pageEditor' , {
		on: {
			contentDom: function() {
				// $this is why we must use window for scope in this block
            			this.editable().on( 'keyup', function( evt ) {
					var key = evt.data.$.keyIdentifier;
					window.eventAndKeyHandler(key);
            			});
            			this.editable().on( 'keydown', function( e ) {
	  				if( e.which === 67 && e.ctrlKey ){
						window.eventAndKeyHandler('copy');
  					}
	  				if( e.which === 86 && e.ctrlKey ){
						window.eventAndKeyHandler('paste');
  					}
	  				if( e.which === 88 && e.ctrlKey ){
						window.eventAndKeyHandler('cut');
  					}
            			});
            			this.editable().on( 'dragover', function( e ) {
					// find parent page and change calc based on its offsets
					var parentPage = $(e.data.$.target).parents("page");
					try {
					    if(typeof parentPage[0] != 'null' && parentPage) {
						window.x = (e.data.$.pageX - parentPage[0].offsetLeft);
						window.y = (e.data.$.pageY - parentPage[0].offsetTop);
					    } else {
						window.x = (e.data.$.pageX);
						window.y = (e.data.$.pageY);
					    }
					   console.log("Y:"+window.y+" X:"+window.x);
					}catch(e) {
						// Not in a page range, no biggie;
					}
            			});
			}
		}
	});
	CKEDITOR.instances.pageEditor.setData(this.props.templateText);
	CKEDITOR.instances.pageEditor.resetDirty();
	ed.on('paste', function( evt ) {
		var targetHtml = evt.data.dataValue;
		if(targetHtml.match(/absolute/)) {
		    var html = $.parseHTML(targetHtml);

			try {
				var pIndex = ( parseInt($(evt.data.range.endContainer.$).parents("page").attr("pagenum"))-1 );
			}catch(e) {var pIndex=0;}
			console.log(pIndex);
			console.log(typeof pIndex);
			if(isNaN(parseInt( pIndex ))) 
				pIndex=0;

		    $.each($(evt.data.dataValue), function(i,el) {
			console.log(pIndex);
			var left = (window.x - window.offsetX);
			var etop = (window.y - (window.offsetY + this.props.pages[parseInt(pIndex)].headerHeight ));
			console.log("EY:"+etop+" EX:"+left);

			$(el).css("top",etop);
			$(el).attr("top",etop);
			$(el).css("left", left);
			$(el).attr("left",left);
			$(el).attr("draggable","true");
			$(el).css("cursor","pointer");
			evt.data.dataValue = el.outerHTML;

			setTimeout(this.dragDropListen,1500);
		    }.bind(this));
		} else {
			//console.log("Paste");
		}
		setTimeout(this.storePageInfo,0);
 	}.bind(this)),
	ed.on('change', function(ev) {
		if(!this.state.editorReady)
			return;

		if(!this.props.needSave)
			this.setPropState({needSave: true});

		if(!this.state.typing && !this.state.mutationObservers)
			setTimeout(this.storePageInfo,0);
	}.bind(this));
	ed.on('extraschange', function(ev) {
		if(!this.state.editorReady)
			return;

		setTimeout(this.extrasChange,0);
	}.bind(this));
	ed.on('instanceReady', function(ev) {
     		var editor = ev.editor;
		editor.document.$.body.setAttribute("contenteditable","false"); 
		editor.document.$.body.setAttribute("unselectable","on");
		CKEDITOR.instances.pageEditor.resetDirty();

		// Make editable area focus no matter where on the page you click
		setTimeout(function() {
			var pages = ev.editor.document.$.getElementsByTagName('page');
			$.each(pages, function(index, page) {
				var thisPage = new CKEDITOR.dom.node(page);
				setTimeout(function() {
					this.pageClickListener(thisPage);
				}.bind(this),0);
			}.bind(this));
		}.bind(this),0);

        	var overridecmd = new CKEDITOR.command(editor, {
            		exec: function(editor) {
				this.popup("Saving Your Template","information");
				this.props.storageWorkerSaveTemplate(function(message) {
					this.popup("Template Saved","information");
				});
				return false;
            		}.bind(this)
        	});
        	editor.commands.save.exec = overridecmd.exec;
		this.dragDropListen();

		var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
		if(MutationObserver) {
			this.setState({mutationObservers: true});
			this.storePageInfo();

			var observer = new MutationObserver(function(mutations) {
				mutations.forEach(function(e) {
					window.mutationObserver(e);
				});
			});

			this.setState({observer: observer});
			setInterval(this.storePageInfo,30000);
		} else {
			/* fall back to old page parser */
			this.setState({mutationObservers: false});
			this.storePageInfo();
			setInterval(this.storePageInfo,8000);
		}
		this.setState({editorReady:true});
	}.bind(this));
    },

    mutationObserver: function(e) {
	var _this = e.target;
	var targetPage = $(_this).parents("page").data("pagenum");
	var pIndex = (parseInt(targetPage)-1);

	if(e.type == "childList") {
	  if(!isNaN(pIndex) && typeof targetPage != 'undefined') {
	    console.log("Mutation on index: "+pIndex);
	    console.log(e);
	    if(e.addedNodes.length > 0) {
	      if(this.props.pageCount > 0 && (this.props.pages[pIndex].maxHeight < $(_this)[0].scrollHeight) ) {
		console.log("Added Nodes - Overflowing?");
		if(this.props.pageCount > targetPage) {
		  window.parseDocumentOverflow(parseInt(targetPage));
		} else {
		  if(CKEDITOR.instances.pageEditor.execCommand('injectblank', false, null)) {
		    this.storePageInfo();
		    this.updateMargins();
		    this.parseDocumentOverflow(parseInt(targetPage));
		  }
	        }
	      }	
	    }
	    if(e.removedNodes.length > 0) {
	      if(this.props.pageCount > 1 ) {
		console.log("Removed Nodes - Underflowing");
		this.parseDocumentUnderflow(parseInt(pIndex));
	      }
	    }  
	  }
	}
    },

    componentDidMount: function () {
	this.setupEditor();
	this.setupWorkers();
    },

    popup: function(message,type) {
        this.props.popup(message,type);
    },

    setPropState: function(payload) {
	if(typeof payload.needSave != 'undefined') {
		window.needSave = payload.needSave;
	}
	if(typeof payload.documentFlowControl != 'undefined') {
		window.documentFlowControl = payload.documentFlowControl;
	}
	if(typeof payload.pageCount != 'undefined') {
		window.pageCount = payload.pageCount;
	}
	this.props.setPropState(payload, 'editor');
    },

    render: function () {
        return (
            <form>
		<Toolbar ref="toolbar"
			templateTitle={this.props.templateTitle}
			org={this.props.org}
			workspace={this.props.workspace}
			app={this.props.app}
			templateId={this.props.templateId}
			setPropsState={this.props.setPropState}
			popup={this.props.popup}
		/>
                <div className="summernote-container">
                    <textarea name="pageEditor" id="pageEditor"></textarea>
                </div>
            </form>
        );
    }
});

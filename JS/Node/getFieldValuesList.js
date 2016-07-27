var _ = require('lodash');
//var cheerio = require('cheerio');

var getFieldValuesList = function(values) {
    var result = {};

    for(var key in values) {
	if(values.hasOwnProperty(key)) {
	  var value = values[key];
          var type = value.type;
          var exId = value.external_id;
          var values = value.values;

          if (type === 'text' || type === 'number' || type === 'money' || type === 'progress') {
            result[exId] = values[0]['value'];
          } else if (type === 'date') {
            var innerValues = ['start', 'end', 'start_date', 'end_date', 'start_time', 'end_time'];
            for (var i = 0; i < innerValues.length; i++) {
                if (values[0][innerValues[i]]) {
                    result[exId + "[" + innerValues[i] + "]"] = values[0][innerValues[i]];
                }
            }
          } else if (type === 'phone') {
            var innerValues = ['mobile', 'work', 'home', 'main', 'work_fax', 'private_fax', 'other'];
            for (var i = 0; i < innerValues.length; i++) {
                if (_.find(values, function(o){ return o.type === innerValues[i] })) {
                    var insertValue = _.find(values, function(o){ return o.type === innerValues[i] });
                    result[exId + "[" + innerValues[i] + "]"] = insertValue['value'];
                }
            }
          } else if (type === 'email') {
            var innerValues = ['work', 'home', 'other'];
            for (var i = 0; i < innerValues.length; i++) {
                if (_.find(values, function(o) { return o.type === innerValues[i] })) {
                    var insertValue = _.find(values, function(o){ return o.type === innerValues[i] });
                    result[exId + "[" + innerValues[i] + "]"] = insertValue['value'];
                }
            }
          } else if (type === 'embed') {
            var innerValues = ['embed_id', 'embed_html', 'description', 'original_url', 'url', 'hostname', 'embed_height', 'resolved_url', 'title', 'type', 'embed_width'];
            for (var i = 0; i < innerValues.length; i++) {
                if (values[0]['embed'][innerValues[i]]) {
                    result[exId + "[" + innerValues[i] + "]"] = values[0]['embed'][innerValues[i]];
                }
            }
          } else if (type === 'location') {
            var innerValues = ['city', 'map_in_sync', 'country', 'formatted', 'value', 'state', 'postal_code', 'lat', 'lng', 'street_address'];
            for (var i = 0; i < innerValues.length; i++) {
                if(values[0][innerValues[i]]) {
                    result[exId + "[" + innerValues[i] + "]"] = values[0][innerValues[i]];
                }
            }
          } else if (type === 'image') {
            var innerValues = ['mimetype', 'perma_link', 'hosted_by', 'description', 'size', 'thumbnail_link', 'link', 'file_id', 'external_file_id', 'link_target', 'name'];
            for (var i = 0; i < innerValues.length; i++) {
                if (values[0]['value'][innerValues[i]]) {
                    result[exId + "[" + innerValues[i] + "]"] = values[0]['value'][innerValues[i]];
                }
            }
          } else if (type === 'contact') {
            if (values[0]['value']['name']) { result[exId + "[name]"] = values[0]['value']['name'] }
            if (values[0]['value']['user_id']) { result[exId + "[user_id]"] = values[0]['value']['user_id'] }
            if (values[0]['value']['title'][0]) { result[exId + "[title]"] = values[0]['value']['title'][0] }
	    try {
            	if (values[0]['value']['image']['link']) { result[exId + "[image]"] = values[0]['value']['image']['link'] }
	    }catch(e) {console.log(e);}
            if (values[0]['value']['mail']) { result[exId + "[mail]"] = values[0]['value']['mail'][0] }
            if (values[0]['value']['phone']) { result[exId + "[phone]"] = values[0]['value']['phone'][0] }
            if (values[0]['value']['address']) { result[exId + "[address]"] = values[0]['value']['address'][0] }
            if (values[0]['value']['city']) { result[exId + "[city]"] = values[0]['value']['city'] }
            if (values[0]['value']['about']) { result[exId + "[about]"] = values[0]['value']['about'] }
          }
	}
    }

    return result;
}

module.exports = getFieldValuesList;

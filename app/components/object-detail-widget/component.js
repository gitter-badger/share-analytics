import Ember from 'ember';
import ENV from 'analytics-dashboard/config/environment';


export default Ember.Component.extend({

    showJSON: false,

    objectData: Ember.computed(function() {
        return this.get('data');
    }),

    dataAsString: Ember.computed(function() {
        var data = this.get('data');
        return JSON.stringify(data, null, '    ');
    }),

    dataUrl: Ember.computed(function() {
        // Use the doi url to link to the resource, otherwise use the first http url
        var data = this.get('objectData');
        var identifiers = data._source.identifiers;
        var httpUrl = null;
        for (var id of identifiers) {
            if (id.includes('doi')) {
                return id;
            }
            else if (!httpUrl && id.includes('http')) {
                httpUrl = id;
            }
        }
        return httpUrl;
    }),

    init(){
        this._super(...arguments);
        let data = this.processData(this.get('data'));
        this.set('data', data);
    },

    processData (data) {
            let datum = data.hits.hits[0];
            var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            options.timeZone = 'UTC';
            options.timeZoneName = 'short'
            if (datum._source.date) {
                datum["_source"]["date"] = (new Date(datum["_source"]["date"])).toLocaleDateString('en-US', options);
            }
            if (datum._source.date_created) {
                datum["_source"]["date_created"] = (new Date(datum["_source"]["date_created"])).toLocaleDateString('en-US', options)
            }
            if (datum._source.date_modified) {
                datum["_source"]["date_modified"] = (new Date(datum["_source"]["date_modified"])).toLocaleDateString('en-US', options)
            }
            if (datum._source.date_published) {
                datum["_source"]["date_published"] = (new Date(datum["_source"]["date_published"])).toLocaleDateString('en-US', options)
            }
            if (datum._source.date_updated) {
                datum["_source"]["date_updated"] = (new Date(datum["_source"]["date_updated"])).toLocaleDateString('en-US', options)
            }
            return datum;
    },

    actions: {

        transitionToFacet(facetDash, parameterName, parameter) {
            let queryParams = {
                id: undefined
            };
            queryParams[parameterName] = parameter;
            this.attrs.transitionToFacet(facetDash, queryParams);
        },

        transitionToSHARE(item) {
              window.location.href = item.url;
        },

        transitionToViewAll(item) {
            this.attrs.transitionToFacet(item.dataType, item);
        }

    }

});

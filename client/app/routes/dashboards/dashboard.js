import Ember from 'ember';
/* global Freewall */
//import 'bower_components/freewall/freewall';
//
export default Ember.Route.extend({

    query: 'UC',
    gte: "1996-01-01",
    lte: (new Date()).toISOString().split('T')[0], // Set the ending date of our query to today's date, by default
    tsInterval: Ember.computed('gte','lte', function() { // Initialize the "bucket size" for our timeseries aggregations
        let d1 = new Date(this.get('gte'));
        let d2 = new Date(this.get('lte'));
        if((d2 - d1) >= 31622400000) { // If our dates are more than a year apart
           return 'month'; // We want to increment our TS data by months
        }
        if((7948800000 <= (d2 - d1)) && ((d2 - d1) < 31622400000)) { // If our dates are less than a year apart but more than three months apart
            return 'week'; // We want to increment our TS data by weeks
        }
        if((d2 - d1) < 7948800000) { // If our data are less than three months apart
            return 'day'; // We want to increment our TS data by days
        }
    }),

    model: function(params) {
        let query = this.get('query');
        let gte = this.get('gte');
        let lte = this.get('lte');
        let interval = this.get('tsInterval');
        return {
            scholar: {
                dasboardName: 'Scholar Dashboard',
                parameters: [
                    "scholar",
                    "institution"
                ],
                widgets: [
                    {
                        chartType: 'totalResults',
                        widgetType: 'number-widget',
                        name: 'Total Results',
                        width: 4,
                        post_body: {
                            "query": {
                                "bool": {
                                    "must": {
                                        "query_string": {"query": "*"}
                                    },
                                    "filter": [
                                        {
                                            "term": {
                                                "sources.raw": "eScholarship @ University of California"
                                            }
                                        },
                                        {
                                            "term": {
                                                "contributors.raw": ""
                                            }
                                        }
                                    ]
                                }
                            }
                        },
                        postBodyParams: [
                            {
                                parameterName: "institution",
                                parameterPath: ["query", "bool", "filter", "term", 0, "sources.raw"]
                            },
                            {
                                parameterName: "scholar",
                                parameterPath: ["query", "bool", "filter", "term", 1, "contributors.raw"]
                            }
                        ],
                    },
                    {
                        chartType: 'totalPublications',
                        widgetType: 'number-widget',
                        name: 'Total Papers',
                        width: 4,
                        post_body: {
                            "query": {
                                "filtered": {
                                    "filter": {
                                        "bool": {
                                            "must": [
                                                {
                                                    "term": {
                                                        'type': "paper"
                                                    }
                                                },
                                                {
                                                    "term": {
                                                        "contributors.raw": ""
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        },
                        postBodyParams: [
                            {
                                parameterName: "institution",
                                parameterPath: ["query", "bool", "must", "query_string", "query"]
                            },
                            {
                                parameterName: "scholar",
                                parameterPath: ["query", "filtered", "filter", "bool", "must", 1, "term", "contributors.raw"]
                            }
                        ],
                    },
                    {
                        chartType: 'timeseries',
                        widgetType: 'c3-chart',
                        name:'Date Histogram',
                        width: 12,
                        post_body: {
                            "query": {
                                "bool": {
                                    "must": {
                                        "range" : {
                                            "date" : {
                                                "gte" : "now-10y/d",
                                                "lt" :  "now/d"
                                            }
                                        }
                                    },
                                    "filter": {
                                        "term": {
                                            "contributors.raw": ""
                                        }
                                    }
                                }
                            },
                            "size": 10,
                            "aggregations": {
                                "sorted_by_type": {
                                    "terms": {
                                        "field": "type"
                                    },
                                    "aggregations": {
                                        "type_over_time": {
                                            "date_histogram": {
                                                "field": "date_updated",
                                                "interval": "1M",
                                                "format": "yyyy-MM-dd"
                                            }
                                        }
                                    }
                                },
                                "all_over_time": {
                                    "date_histogram": {
                                        "field": "date",
                                        "interval": "1M",
                                        "format": "yyyy-MM-dd"
                                    }
                                }
                            }
                        },
                        postBodyParams: [
                            {
                                parameterName: "institution",
                                parameterPath: ["query", "bool", "must", "query_string", "query"]
                            },
                            {
                                parameterPath: ["query", "bool", "filter", "term", "contributors.raw"],
                                parameterName: "scholar"
                            }
                        ],
                        facetDash: "worktype"
                    },
                    {
                        chartType: 'topContributors',
                        widgetType: 'top-contributors',
                        name: 'Top Contributors',
                        facetDash: "scholar",
                        width: 4,
                        post_body: {
                            "query": {
                                "bool": {
                                    "must": {
                                        "query_string": {"query": ""}
                                    },
                                    "filter": [{
                                        "term": {
                                            "sources.raw": "eScholarship @ University of California"
                                        }
                                    }]
                                }
                            },
                            from: 0,
                            aggregations: {
                                contributors : {
                                    terms : {
                                        field: 'contributors.raw',
                                        size: 10
                                    }
                                }
                            }
                        },
                        postBodyParams: [
                            {
                                parameterName: "institution",
                                parameterPath: ["query", "bool", "must", "query_string", "query"]
                            },
                            {
                                parameterName: "scholar",
                                parameterPath: ["query", "bool", "must", "query_string", "query"]
                            }
                        ]
                    },
                    {
                        chartType: 'donut',
                        widgetType: 'c3-chart',
                        name: 'NIH Funding Sources 2016',
                        width: 4,
                        post_body: {
                            query: {
                                bool: { must: [{
                                        query_string: {query: query}
                                    },{
                                        range: { date: {
                                                   gte: gte,
                                                   lte: lte,
                                                   format: "yyyy-MM-dd||yyyy"
                                                   }
                                        }
                                    }
                                ]}
                            },
                            from: 0,
                            aggregations: {
                                sources: {
                                    terms: {
                                         field: 'sources.raw',
                                         size: 200
                                    }
                                },
                                contributors : {
                                    terms : {
                                        field: 'contributors.raw',
                                        size: 200
                                    }
                                },
                                tags : {
                                    terms : {
                                        field: 'tags.raw',
                                        size: 200
                                    }
                                },
                                articles_over_time: {
                                    date_histogram: {
                                        field: 'date',
                                        interval: interval,
                                        format:'yyyy-MM-dd'
                                    },
                                    aggregations: {
                                        arttype: {terms: {field: 'type'}}
                                    }
                                }
                            }
                        },
                        postBodyParams: [
                            {
                                parameterName: "institution",
                                parameterPath: ["query", "bool", "must", "query_string", "query"]
                            },
                            {
                                parameterName: "scholar",
                                parameterPath: ["query", "bool", "must", 0, "query_string", "query"]
                            }
                        ],
                        facetDash: "funder"
                    }
                ]
            },
            institution: {
                dasboardName: 'Institution Overview Dashboard',
                parameters: [
                    "institution"
                ],
                widgets: [
                    {
                        chartType: 'totalResults',
                        widgetType: 'number-widget',
                        name: 'Total Results',
                        width: 4,
                        post_body: {
                            "query": {
                                "bool": {
                                    "filter": [{
                                        "term": {
                                            "sources.raw": "eScholarship @ University of California"
                                        }
                                    }]
                                }
                            }
                        },
                        postBodyParams: [],
                        widgetSettings : {
                            fontSize: 2,
                            fontColor: '#F44336'
                        }
                    },
                    {
                        chartType: 'numberValue',
                        widgetType: 'number-widget',
                        name: 'Funding from NIH',
                        width: 4,
                        post_body: null,
                        postBodyParams: [],
                        widgetSettings : {
                            value : '400',
                            fontSize: 2,
                            fontColor: '#F44336',
                            pre : '$',
                            post: 'M'
                        }
                    },
                    {
                        chartType: 'relatedResearchers',
                        widgetType: 'number-widget',
                        name: 'Related Researchers',
                        width: 4,
                        post_body: {
                            "query": {
                                "bool": {
                                    "must": {
                                        "query_string": {"query": ""}
                                    },
                                    "filter": [{
                                        "term": {
                                            "sources.raw": "eScholarship @ University of California"
                                        }
                                    }]
                                }
                            },
                            "aggregations": {
                                "relatedContributors" : {
                                    "cardinality": {
                                        "field": "lists.contributors.id"
                                    }
                                }
                            }
                        },
                        postBodyParams: [
                           {
                                parameterPath: ["query", "bool", "filter", 0, "term", "sources.raw"],
                                parameterName: "institution"
                            }
                        ],
                        widgetSettings : {
                            fontSize: 2,
                            fontColor: '#F44336'
                        },
                        facetDash: "scholar"
                    },
                    {
                        chartType: 'timeseries',
                        widgetType: 'c3-chart',
                        name:'Date Histogram',
                        width: 12,
                        facetDash: "arttype",
                        post_body: {
                            "query": {
                                "bool": {
                                    "must": {
                                        "range" : {
                                            "date" : {
                                                "gte" : "now-10y/d",
                                                "lt" :  "now/d"
                                            }
                                        }
                                    },
                                    "filter": {
                                        "term": {
                                            "sources.raw": "eScholarship @ University of California"
                                        }
                                    }
                                }
                            },
                            "size": 10,
                            "aggregations": {
                                "sorted_by_type": {
                                    "terms": {
                                        "field": "type"
                                    },
                                    "aggregations": {
                                        "type_over_time": {
                                            "date_histogram": {
                                                "field": "date_updated",
                                                "interval": "1M",
                                                "format": "yyyy-MM-dd"
                                            }
                                        }
                                    }
                                },
                                "all_over_time": {
                                    "date_histogram": {
                                        "field": "date",
                                        "interval": "1M",
                                        "format": "yyyy-MM-dd"
                                    }
                                }
                            }
                        },
                        postBodyParams: [
                            {
                                parameterPath: ["query", "bool", "filter", "term", "sources.raw"],
                                parameterName: "institution"
                            }
                        ]
                    },
                    {
                        chartType: 'topContributors',
                        widgetType: 'list-widget',
                        name: 'Top Contributors',
                        width: 4,
                        post_body : {
                            query: {
                                bool: {
                                    must: {
                                        query_string: {query: query}
                                    }
                                }
                            },
                            from: 0,
                            aggregations: {
                                listWidgetData : {
                                    terms : {
                                        field: 'contributors.raw',
                                        size: 10
                                    }
                                }
                            }
                        },
                        postBodyParams: [
                            {
                                parameterName: "query",
                                parameterPath: ["query", "bool", "must", "query_string", "query"]
                            }
                        ],
                        facetDash: "scholar"
                    },
                    {
                        chartType: 'donut',
                        widgetType: 'c3-chart',
                        name: 'NIH Funding Sources 2016',
                        width: 4,
                        post_body: {
                            query: {
                                bool: { must: [{
                                        query_string: {query: query}
                                    },{
                                        range: { date: {
                                                   gte: gte,
                                                   lte: lte,
                                                   format: "yyyy-MM-dd||yyyy"
                                                   }
                                        }
                                    }
                                ]}
                            },
                            from: 0,
                            aggregations: {
                                sources: {
                                    terms: {
                                         field: 'sources.raw',
                                         size: 200
                                    }
                                },
                                contributors : {
                                    terms : {
                                        field: 'contributors.raw',
                                        size: 200
                                    }
                                },
                                tags : {
                                    terms : {
                                        field: 'tags.raw',
                                        size: 200
                                    }
                                }
                            }
                        },
                        postBodyParams: [
                            {
                                parameterName: "query",
                                parameterPath: ["query", "bool", "must", 0, "query_string", "query"]
                            }
                        ],
                        facetDash: "funder"
                    },
                    {
                        chartType: 'topContributors',
                        widgetType: 'list-widget',
                        name: 'Top Tags',
                        width: 4,
                        post_body : {
                            query: {
                                bool: {
                                    must: {
                                        query_string: {query: query}
                                    }
                                }
                            },
                            from: 0,
                            aggregations: {
                                listWidgetData : {
                                    terms : {
                                        field: 'tags',
                                        size: 10
                                    }
                                }
                            }
                        },
                        postBodyParams: [
                            {
                                parameterName: "query",
                                parameterPath: ["query", "bool", "must", "query_string", "query"]
                            }
                        ],
                        facetDash: "topic"
                    }
                ]
            },
            topic: {
                dasboardName: 'Institution Subject Area Dashboard',
                parameters: [
                    "scholar",
                    "institution",
                    "topic"
                ],
                widgets: [
                    {
                        chartType: 'totalResults',
                        widgetType: 'number-widget',
                        name: 'Total Results',
                        width: 4,
                        post_body: {
                            "query": {
                                "bool": {
                                    "must": {
                                        "query_string": {"query": ""}
                                    },
                                    "filter": []
                                }
                            },
                        },
                        postBodyParams: [
                            {
                                parameterName: "topic",
                                parameterPath: ["query", "bool", "must", "query_string", "query"]
                            },
                            {
                                parameterName: "institution",
                                parameterPath: ["query", "bool", "filter", 0, "term", "sources.raw"]
                            },
                            {
                                parameterName: "contributor",
                                parameterPath: ["query", "bool", "filter", 1, "term", "sources.raw"]
                            }
                        ],
                    },
                    {
                        chartType: 'totalPublications',
                        widgetType: 'number-widget',
                        name: 'Total Publications',
                        width: 4,
                        post_body: {
                            query: {
                                bool: {
                                    must: {
                                        query_string: {query: query}
                                    },
                                    filter: [{
                                        term: {
                                            'type.raw': "*"
                                        }
                                    }]
                                }
                            }
                        },
                        postBodyParams: [
                            {
                                parameterName: "id",
                                parameterPath: ["query", "bool", "must", "query_string", "query"]
                            }
                        ],
                    },
                    {
                        chartType: 'timeseries',
                        widgetType: 'c3-chart',
                        name: 'Date Histogram',
                        width: 12,
                        post_body: {
                            "query": {
                                 "bool": {
                                    "must": [
                                        {
                                            "query_string": {
                                                "query": "hiv"
                                            }
                                        },
                                        {
                                            "range" : {
                                                "date" : {
                                                    "gte" : "now-10y/d",
                                                    "lt" :  "now/d"
                                                }
                                            }
                                        }
                                    ]
                                }
                            },
                            "size": 10,
                            "aggregations": {
                                "sorted_by_type": {
                                    "terms": {
                                        "field": "type"
                                    },
                                    "aggregations": {
                                        "type_over_time": {
                                            "date_histogram": {
                                                "field": "date_updated",
                                                "interval": "1M",
                                                "format": "yyyy-MM-dd"
                                            }
                                        }
                                    }
                                },
                                "all_over_time": {
                                    "date_histogram": {
                                        "field": "date_updated",
                                        "interval": "1M",
                                        "format": "yyyy-MM-dd"
                                    }
                                }
                            }
                        },
                        postBodyParams: [
                            {
                                parameterName: "id",
                                parameterPath: ["query", "bool", "must", 0, "query_string", "query"]
                            }
                        ],
                        facetDash: "arttype"
                    },
                    {
                        chartType: 'topContributors',
                        widgetType: 'list-widget',
                        name: 'Top Tags',
                        width: 4,
                        post_body: {
                            "query": {
                                "bool": {
                                    "must": {
                                        "query_string": {
                                            "query": query
                                        }
                                    }
                                }
                            },
                            "from": 0,
                            "aggregations": {
                                "listWidgetData" : {
                                    "terms": {
                                        "field": 'tags',
                                        "size": 10
                                    }
                                }
                            }
                        },
                        postBodyParams: [
                            {
                                parameterName: "id",
                                parameterPath: ["query", "bool", "must", "query_string", "query"]
                            }
                        ],
                        facetDash: "scholar"
                    },
                    {
                        chartType: 'donut',
                        widgetType: 'c3-chart',
                        name: 'Events by Source',
                        width: 4,
                        post_body: {
                            query: {
                                bool: { must: [{
                                        query_string: {query: query}
                                    },{
                                        range: { date: {
                                                   gte: gte,
                                                   lte: lte,
                                                   format: "yyyy-MM-dd||yyyy"
                                                   }
                                        }
                                    }
                                ]}
                            },
                            from: 0,
                            aggregations: {
                                sources: {
                                    terms: {
                                         field: 'sources.raw',
                                         size: 200
                                    }
                                },
                            }
                        },
                        postBodyParams: [
                        ],
                        facetDash: "institution",
                    },
                    {
                        chartType: 'topContributors',
                        widgetType: 'list-widget',
                        name: 'Top Contributors',
                        width: 4,
                        post_body : {
                            "query": {
                                "bool": {
                                    "must": {
                                        "query_string": {"query": query}
                                    }
                                }
                            },
                            "from": 0,
                            "aggregations": {
                                "listWidgetData": {
                                    "terms": {
                                        "field": 'contributors.raw',
                                        "size": 10
                                    }
                                }
                            }
                        },
                        postBodyParams: [
                            {
                                parameterName: "id",
                                parameterPath: ["query", "bool", "must", "query_string", "query"]
                            }
                        ],
                        facetDash: "scholar"
                    },
                    {
                        chartType: 'relevanceHistogram',
                        widgetType: 'c3-chart',
                        name:'Relevance Histogram',
                        width: 12,
                        post_body: {
                            query: {
                                bool: {
                                    must: [{
                                        query_string: {
                                            query: "hiv"
                                        }
                                    }]
                                }
                            },
                            size: 0,
                            aggregations: {
                                all_score: {
                                    histogram: {
                                            interval: 1,
                                            script: {
                                            lang: "expression",
                                                inline: "_score * 10"
                                        }
                                    }
                                },
                                filtered_score: {
                                    filters: {
                                        filters: {
                                            "UC": {
                                                term: {
                                                   'sources.raw': "eScholarship @ University of California"
                                                }
                                            },
                                            "DOE": {
                                                term: {
                                                    'sources.raw': "DoE's SciTech Connect Database"
                                                }
                                            }
                                        }
                                    },
                                    aggregations: {
                                        score: {
                                            histogram: {
                                                interval: 1,
                                                script: {
                                                    lang: "expression",
                                                    inline: "_score * 10"
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        facetDash: "shareresults",
                        postBodyParams: [
                            {
                                parameterName: "id",
                                parameterPath: ["query", "bool", "must", 0, "query_string", "query"]
                            }
                        ],
                    }
                ]
            }
        }[params.dashboard];
        //return Ember.RSVP.hash({
        //    widgets: this.get('store').peekAll('widget').map((item) => {
        //        return {
        //            name: item.get('name'),
        //            author: item.get('author'),
        //            width: item.get('width'),
        //            height: item.get('height'),
        //            query: item.get('query'),
        //            settings: item.get('settings')
        //        }
        //    }),
        //    settings: {}
        //});
        //
        let widgets = this.get('widgets');
        this.set('institutionName', "eScholarship @ University of California");
        debugger;
        this.set('widgets', widgets.map((widget) => {
            if (widget.postBodyParams) {
                widget.postBodyParams.map((param) => {
                    let path_parts = param.parameterPath.slice(0, -1)
                    let nested_object = path_parts.reduce((nested, pathPart) => {
                        return nested[pathPart];
                    }, widget.post_body)
                    let parameter_key = param.parameterPath[param.parameterPath.length-1];
                    let parameter_value = controller.get(param.parameterName);
                    nested_object[parameter_key] = parameter_value;
                    return;
                });
            }
            return widget;
        }));
    },

    setupController: function(controller, model) {
        this._super(controller, model);
        controller.set('queryParams', model.parameters);
        if (controller.get('query') === undefined) { // This will change depending on what default will be in the storage backend
            controller.set('query', model.query);
        }
        controller.set('institutionName', "eScholarship @ University of California");
        controller.set('widgets', model.widgets);
    }

});
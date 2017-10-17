angular.module("collection", []).controller("CollectionController", ["$http", function CollectionController($http) {
    this.root = "";
    this.userId = "";
    this.userName = "";
    this.projectId = "";
    this.currentProject = null;
    this.currentPlot = null;
    this.userSamples = {};
    this.plotsAssigned = 0;
    this.plotsFlagged = 0;
    this.imageryList = [];
    this.showSideBar = false;
    this.mapclass = "fullmap";
    this.quitclass = "quit-full";
    this.statClass = "projNoStats";
    this.arrowstate = "arrow-down";
    var mycollection = this;

    this.getProjectById = function (projectId, userId) {
        $http.get(this.root + "/get-project-by-id/" + projectId)
            .then(angular.bind(this, function successCallback(response) {
                if (response.data == "") {
                    alert("No project found with ID " + projectId + ".");
                    window.location = this.root + "/home";
                } else {
                    this.currentProject = response.data;
                    this.initialize(this.root, userId, this.userName, projectId);
                }
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the project info. See console for details.");
            });
    };

    this.getImageryList = function (institutionId) {
        $http.get(this.root + "/get-all-imagery?institutionId=" + institutionId)
            .then(angular.bind(this, function successCallback(response) {
                this.imageryList = response.data;
                this.initialize(this.root, this.userId, this.userName, this.projectId);
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the imagery list. See console for details.");
            });
    };
    this.toggleStats = function(){
        if(this.statClass == "projNoStats"){
            this.statClass = "projStats";
            this.arrowstate = "arrow-up";
         }
         else{
            this.statClass = "projNoStats";
            this.arrowstate = "arrow-down";
         }
    };
    this.setBaseMapSource = function () {
        map_utils.set_current_imagery(this.currentProject.baseMapSource);
        var attribution = this.imageryList.find(
            function (imagery) {
                return imagery.title == this.currentProject.baseMapSource;
            },
            this
        ).attribution;
        if (this.currentProject.baseMapSource == "DigitalGlobeWMSImagery") {
            this.currentProject.attribution = attribution + " | " + this.currentProject.imageryYear + " (" + this.currentProject.stackingProfile + ")";
        } else {
            this.currentProject.attribution = attribution;
        }
    };

    this.initialize = function (documentRoot, userId, userName, projectId) {
        // Make the current documentRoot, userId, userName, and projectId globally available
        this.root = documentRoot;
        this.userId = userId;
        this.userName = userName;
        this.projectId = projectId;

        if (this.currentProject == null) {
            // Load the project details
            this.getProjectById(projectId, userId);
        } else if (angular.equals(this.imageryList, [])) {
            // Load the imageryList
            this.getImageryList(this.currentProject.institution);
        } else {
            // Initialize the base map and show the selected project's boundary
            map_utils.digital_globe_base_map({div_name: "image-analysis-pane",
                                              center_coords: [0.0, 0.0],
                                              zoom_level: 1},
                                             this.imageryList);
            map_utils.set_dg_wms_layer_params(this.currentProject.imageryYear, this.currentProject.stackingProfile);
            this.setBaseMapSource();
            map_utils.draw_polygon(this.currentProject.boundary);
            this.loadProjectPlots();
        }
    };

    this.getPlotData = function (projectId) {
        $http.get(this.root + "/get-unanalyzed-plot/" + projectId)
            .then(angular.bind(this, function successCallback(response) {
                if (response.data == "done") {
                    this.currentPlot = null;
                    alert("All plots have been analyzed for this project.");
                } else {
                    this.currentPlot = response.data;
                    this.loadRandomPlot();
                }
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving plot data. See console for details.");
            });
    };

    this.getPlotDatabyid = function (projectId, plotid) {
        $http.get(this.root + "/get-unanalyzed-plot-byid/" + projectId + "/" + plotid)
            .then(angular.bind(this, function successCallback(response) {
                if (response.data == "done") {
                    this.currentPlot = null;
                    alert("All plots have been analyzed for this project.");
                } else {
                    mreturn = response.data;
                    this.currentPlot = response.data[0];
                    this.loadRandomPlot();
                }
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving plot data. See console for details.");
            });
    };
    this.loadPlotById = function (id) {
        if (this.currentPlot == null) {
            this.getPlotDatabyid(this.projectId, id);
        } else {
            utils.enable_element("flag-plot-button");
            // map_utils.draw_plot(this.currentPlot.center, this.currentProject.plotSize, this.currentProject.plotShape);
            map_utils.draw_points(this.currentPlot.samples);
            window.open(this.root + "/geo-dash?editable=false&"
                        + encodeURIComponent("title=" + this.currentProject.name
                                             + "&pid=" + this.projectId
                                             + "&aoi=[" + map_utils.get_view_extent()
                                             + "]&daterange=&bcenter=" + this.currentPlot.center
                                             + "&bradius=" + this.currentProject.plotSize / 2),
                        "_geo-dash");
        }
    };
    this.loadRandomPlot = function () {
        if (this.currentPlot == null) {
            this.getPlotData(this.projectId);
        } else {
            utils.enable_element("flag-plot-button");
            // map_utils.draw_plot(this.currentPlot.center, this.currentProject.plotSize, this.currentProject.plotShape);
            map_utils.draw_points(this.currentPlot.samples);
            window.open(this.root + "/geo-dash?editable=false&"
                        + encodeURIComponent("title=" + this.currentProject.name
                                             + "&pid=" + this.projectId
                                             + "&aoi=[" + map_utils.get_view_extent()
                                             + "]&daterange=&bcenter=" + this.currentPlot.center
                                             + "&bradius=" + this.currentProject.plotSize / 2),
                        "_geo-dash");
        }
    };

    this.nextPlot = function () {
        mycollection.showSideBar = true;
        mycollection.mapclass = "sidemap";
        mycollection.quitclass = "quit-side";
        map_utils.remove_plots_layer();
        //mycollection.loadPlotById(feature.get("id"));

        map_utils.map_ref.updateSize();
        window.setTimeout('map_utils.map_ref.updateSize()', 550);
        this.currentPlot = null;
        this.userSamples = {};
        utils.disable_element("flag-plot-button");
        utils.disable_element("save-values-button");
        this.loadRandomPlot();
    };

    this.setCurrentValue = function (sampleValueGroup, sampleValue) {
        var selectedFeatures = map_utils.get_selected_samples();
        if (selectedFeatures && selectedFeatures.getLength() > 0) {
            selectedFeatures.forEach(
                function (sample) {
                    var pointAssignments = this.userSamples[sample.get("sample_id")];
                    if (pointAssignments) {
                        pointAssignments[sampleValueGroup.name] = sampleValue.name;
                    } else {
                        pointAssignments = {};
                        pointAssignments[sampleValueGroup.name] = sampleValue.name;
                    }
                    this.userSamples[sample.get("sample_id")] = pointAssignments;
                    map_utils.highlight_sample(sample, sampleValue.color);
                },
                this // necessary to pass outer scope into function
            );
            selectedFeatures.clear();
            utils.blink_border(sampleValue.name + "_" + sampleValue.id);
            if (Object.keys(this.userSamples).length == this.currentPlot.samples.length
                && Object.values(this.userSamples).every(function (values) {
                    return Object.keys(values).length == this.currentProject.sampleValues.length;
                }, this)) {
                utils.enable_element("save-values-button");
                utils.disable_element("new-plot-button");
            }
        } else {
            alert("No sample points selected. Please click some first.");
        }
    };

    this.saveValues = function () {
        $http.post(this.root + "/add-user-samples",
                   {projectId: this.projectId,
                    plotId: this.currentPlot.id,
                    userId: this.userName,
                    userSamples: this.userSamples})
            .then(angular.bind(this, function successCallback(response) {
                alert("Your assignments have been saved to the database.");
                map_utils.disable_selection();
                this.plotsAssigned++;
                this.nextPlot();
            }), function errorCallback(response) {
                console.log(response);
                alert("Error saving your assignments to the database. See console for details.");
            });
    };

    this.flagPlot = function () {
        $http.post(this.root + "/flag-plot",
                   {projectId: this.projectId,
                    plotId:    this.currentPlot.id})
            .then(angular.bind(this, function successCallback(response) {
                alert("Plot " + this.currentPlot.id + " has been flagged.");
                this.plotsFlagged++;
                this.nextPlot();
            }), function errorCallback(response) {
                console.log(response);
                alert("Error flagging plot as bad. See console for details.");
            });
    };

    this.loadProjectPlots = function(){
        $http.get(this.root + "/get-project-plots/" + this.projectId + "/1000")
                .then(angular.bind(this, function successCallback(response) {
                    //alert("Plot " + mycollection.currentPlot.id + " has been flagged.");
                   /* response.data.forEach(function(plot){
                        map_utils.draw_point(JSON.parse(plot.center).coordinates[0], JSON.parse(plot.center).coordinates[1], "red_fill", plot.id);
                    });
                    */
                    mreturn = response.data;
                    map_utils.draw_project_points(response.data, "red_fill");
                    var plotclick = function(feature){
                                                        if(feature.get("id") != null){
                                                            mycollection.showSideBar = true;
                                                            mycollection.mapclass = "sidemap";
                                                            mycollection.quitclass = "quit-side";
                                                            map_utils.remove_plots_layer();
                                                            mycollection.loadPlotById(feature.get("id"));
                                                            }
                                                            map_utils.map_ref.updateSize();
                                                            window.setTimeout('map_utils.map_ref.updateSize()', 550);

                                                            };
                    map_utils.map_ref.on("click", function(event){map_utils.map_ref.forEachFeatureAtPixel(event.pixel, plotclick)});

                    //loadPlotById
                }), function errorCallback(response) {
                    console.log(response);
                    alert("Error flagging plot as bad. See console for details.");
                });
    }

}]);
var mreturn;
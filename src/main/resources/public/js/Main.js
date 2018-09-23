var cp="",im="",pl="";
class Collection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            documentRoot:this.props.documentRoot,
            currentProject : null,
            stats : null,
            plotList : null,
            imageryList : null,
            currentImagery : {attribution: ""},
            imageryYearDG : 2009,
            stackingProfileDG : "Accuracy_Profile",
            imageryYearPlanet : 2018,
            imageryMonthPlanet : "03",
            mapConfig : null,
            currentPlot : null,
            userSamples : {},
            statClass : "projNoStats",
            arrowState : "arrow-down",
            showSideBar : false,
            mapClass : "fullmap",
            quitClass : "quit-full",
        };
        this.setBaseMapSource=this.setBaseMapSource.bind(this);
        this.updateDGWMSLayer=this.updateDGWMSLayer.bind(this);
        this.updatePlanetLayer=this.updatePlanetLayer.bind(this);
        this.nextPlot=this.nextPlot.bind(this);
        this.setCurrentValue=this.setCurrentValue.bind(this);
        this.loadPlotById=this.loadPlotById.bind(this);
        this.saveValues=this.saveValues.bind(this);
    };
    componentDidMount() {
        this.initialization();
    }
    getProjectById(){
        fetch(this.state.documentRoot + "/get-project-by-id/" + this.props.projectId)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                else {
                    console.log(response);
                    alert("Error retrieving the project info. See console for details.");
                }
            })
            .then(data => {
                if (data == null || data.id == 0) {
                    alert("No project found with ID " + this.props.projectId + ".");
                    window.location = this.state.documentRoot + "/home";
                } else {
                    this.setState({currentProject: data});
                    this.getImageryList(data.institution);
                }
            });
    }
    getProjectStats(){
        fetch(this.state.documentRoot + "/get-project-stats/" + this.props.projectId)
                .then(response => {
                    if (response.ok) {
                        return response.json();
                    }
                    else {
                        console.log(response);
                        alert("Error getting project stats. See console for details.");
                    }
                })
                .then(data => {
                    this.setState({stats: data});
               //   this.initialization();
                });
    }
    getProjectPlots(){
        fetch(this.state.documentRoot + "/get-project-plots/" + this.props.projectId + "/1000")
                .then(response => {
                    if (response.ok) {
                        return response.json();
                    }
                    else {
                        console.log(response);
                        alert("Error loading plot data. See console for details.");
                    }
                })
                .then(data => {
                    this.setState({plotList: data});
                  //  this.initialization();
                });
    }
    getImageryList(institution) {
        fetch(this.state.documentRoot + "/get-all-imagery?institutionId=" + institution)
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                else {
                    console.log(response);
                    alert("Error retrieving the imagery list. See console for details.");
                }
            })
            .then(data => {
                this.setState({imageryList: data})
              //  this.initialization();
            });
    }
    setBaseMapSource() {
        if (this.state.currentProject != null && this.state.mapConfig != null) {
            var bms = document.getElementById("base-map-source");
            if(bms!=null) {
                var proj = this.state.currentProject;
                proj.baseMapSource = bms.options[bms.selectedIndex].value;
                this.setState({currentProject: proj});
            }
            mercator.setVisibleLayer(this.state.mapConfig, this.state.currentProject.baseMapSource);
            var cimagery=this.getImageryByTitle(this.state.currentProject.baseMapSource);
            this.setState({currentImagery:cimagery})
            if (this.state.currentProject.baseMapSource == "DigitalGlobeWMSImagery") {
                cimagery.attribution += " | " + this.state.imageryYearDG + " (" + this.state.stackingProfileDG + ")";
                this.setState({currentImagery: cimagery});
                this.updateDGWMSLayer();
            } else if (this.state.currentProject.baseMapSource == "PlanetGlobalMosaic") {
                cimagery.attribution += " | " + this.state.imageryYearPlanet + "-" + this.state.imageryMonthPlanet;
                this.setState({currentImagery: cimagery});
                this.updatePlanetLayer();
            }
        }
    }
    showProjectPlots() {
        if(this.state.plotList!=null) {
            mercator.addPlotLayer(this.state.mapConfig,
                this.state.plotList,
                (feature) => {// FIXME: These three assignments don't appear to do anything
                    this.setState({showSideBar: true});
                    this.setState({mapClass: "sidemap"});
                    this.setState({quitClass: "quit-side"});
                    this.loadPlotById(feature.get("features")[0].get("plotId"));
                }
            );
        }
    }
    getImageryByTitle(imageryTitle) {
        return this.state.imageryList.find(
            function (imagery) {
                return imagery.title == imageryTitle;
            }
        );
    };
    updateDGWMSLayer() {
        mercator.updateLayerWmsParams(this.state.mapConfig,
            "DigitalGlobeWMSImagery",
            {
                COVERAGE_CQL_FILTER: "(acquisition_date>='" + this.state.imageryYearDG + "-01-01')"
                    + "AND(acquisition_date<='" + this.state.imageryYearDG + "-12-31')",
                FEATUREPROFILE: this.state.stackingProfileDG
            });
    }
    updatePlanetLayer() {
        mercator.updateLayerSource(this.state.mapConfig,
            "PlanetGlobalMosaic",
            function (sourceConfig) {
                sourceConfig.month = this.state.imageryMonthPlanet;
                sourceConfig.year = this.state.imageryYearPlanet;
                return sourceConfig;
            },
            this);
    }
    loadPlotById(plotId) {
        var mapConfig=this.state.mapConfig;
        var currentPlot=this.state.currentPlot;
        if (this.state.currentPlot == null) {
            this.getPlotDataById(plotId);
        } else {
            // FIXME: What is the minimal set of these that I can execute?
            utils.enable_element("new-plot-button");
            utils.enable_element("flag-plot-button");
            if(document.getElementById("flag-plot-button")!=null){
                var ref=this;
                document.getElementById("flag-plot-button").onclick=function () {
                 ref.flagPlot();
                }
            }
            utils.disable_element("save-values-button");

            // FIXME: These classes should be handled with an ng-if in collection.ftl
            document.getElementById("go-to-first-plot-button").classList.add("d-none");
            document.getElementById("plot-nav").classList.remove("d-none");

            // FIXME: These three assignments don't appear to do anything
            this.setState({showSideBar : true});
            this.setState({mapClass : "sidemap"});
            this.setState({quitClass : "quit-side"});

            // FIXME: Move these calls into a function in mercator-openlayers.js
            mercator.disableSelection(mapConfig);
            mercator.removeLayerByTitle(mapConfig, "currentSamples");
            mercator.addVectorLayer(mapConfig,
                "currentSamples",
                mercator.samplesToVectorSource(currentPlot.samples),
                ceoMapStyles.redPoint);
            mercator.enableSelection(mapConfig, "currentSamples");
            mercator.zoomMapToLayer(mapConfig, "currentSamples");
            window.open(this.state.documentRoot + "/geo-dash?editable=false&"
                + encodeURIComponent("title=" + this.state.currentProject.name
                    + "&pid=" + this.props.projectId
                    + "&aoi=[" + mercator.getViewExtent(mapConfig)
                    + "]&daterange=&bcenter=" + currentPlot.center
                    + "&bradius=" + this.state.currentProject.plotSize / 2),
                "_geo-dash");
        }
    }
    getPlotDataById(plotId) {
        fetch(this.state.documentRoot + "/get-unanalyzed-plot-by-id/" + this.props.projectId + "/" + plotId)
            .then(response => {
                if (response.ok) {
                  //  console.log(response.text());
                   return response.text();
                }
                else {
                    console.log(response);
                    alert("Error retrieving plot data. See console for details.");
                }
            })
            .then(data=> {
            if (data == "done") {
                this.setState({currentPlot: null});
                this.showProjectPlots();
                alert("This plot has already been analyzed.");
            }
            else if (data == "not found") {
                this.setState({currentPlot: null});
                this.showProjectPlots();
                alert("No plot with ID " + plotId + " found.");
            }
            else {
                this.setState({currentPlot: JSON.parse(data)});
                this.loadPlotById(plotId);
            }
        });
    }
    setCurrentValue(sampleValueGroup, sampleValue) {
        var selectedFeatures = mercator.getSelectedSamples(this.state.mapConfig);
        if (selectedFeatures && selectedFeatures.getLength() > 0) {
            selectedFeatures.forEach(
                function (sample) {
                    var sampleId = sample.get("sampleId");
                    var uSamples=this.state.userSamples;
                    if (!this.state.userSamples[sampleId]) {
                        uSamples[sampleId]={};
                        this.setState({userSamples:uSamples});
                    }
                    uSamples[sampleId][sampleValueGroup.name] = sampleValue.name;
                    this.setState({userSamples:uSamples});
                    mercator.highlightSamplePoint(sample, sampleValue.color);
                },
                this // necessary to pass outer scope into function
            );
            selectedFeatures.clear();
            utils.blink_border(sampleValue.name + "_" + sampleValue.id);
            if (Object.keys(this.state.userSamples).length == this.state.currentPlot.samples.length
                && Object.values(this.state.userSamples).every(function (values) {
                    return Object.keys(values).length == this.state.currentProject.sampleValues.length;
                }, this)) {
                // FIXME: What is the minimal set of these that I can execute?
                    utils.enable_element("save-values-button");
                if(document.getElementById("save-values-button")!=null) {
                    var ref=this;
                    document.getElementById("save-values-button").onclick = function () {
                        ref.saveValues();
                    }
                }
                    utils.disable_element("new-plot-button");
            }

        } else {
            alert("No sample points selected. Please click some first.");
        }
    }
    flagPlot() {
        var ref=this;
        if(ref.state.currentPlot!=null) {
            $.ajax({
                url: ref.state.documentRoot + "/flag-plot",
                type: "POST",
                async: true,
                crossDomain: true,
                contentType: false,
                processData: false,
                data: JSON.stringify({
                    projectId: ref.props.projectId,
                    plotId: ref.state.currentPlot.id,
                    userId: ref.props.userName
                })
            }).fail(function () {
                alert("Error flagging plot as bad. See console for details.");
            }).done(function (data) {
                var statistics=ref.state.stats;
                statistics.flaggedPlots=statistics.flaggedPlots+1;
                ref.setState({stats:statistics});
                ref.nextPlot();
            });
        }
    }
    nextPlot() {
        // FIXME: What is the minimal set of these that I can execute?
        utils.enable_element("new-plot-button");
        utils.enable_element("flag-plot-button");
        utils.disable_element("save-values-button");

        // FIXME: These classes should be handled with an ng-if in collection.ftl
        document.getElementById("go-to-first-plot-button").classList.add("d-none");
        document.getElementById("plot-nav").classList.remove("d-none");
        // FIXME: These three assignments don't appear to do anything
        this.setState({showSideBar: true});
        this.setState({mapClass: "sidemap"});
        this.setState({quitClass: "quit-side"});
        mercator.removeLayerByTitle(this.state.mapConfig, "currentPlots");
        mercator.removeLayerByTitle(this.state.mapConfig, "currentSamples");
        this.setState({currentPlot: null});
        this.setState({userSamples: {}});
        this.loadRandomPlot();
    }
    loadRandomPlot() {
        if (this.state.currentPlot == null) {
            this.getPlotData();
        } else {
            // FIXME: What is the minimal set of these that I can execute?
            utils.enable_element("flag-plot-button");

            // FIXME: Move these calls into a function in mercator-openlayers.js
            mercator.disableSelection(this.state.mapConfig);
            mercator.removeLayerByTitle(this.state.mapConfig, "currentSamples");
            mercator.addVectorLayer(this.state.mapConfig,
                "currentSamples",
                mercator.samplesToVectorSource(this.state.currentPlot.samples),
                ceoMapStyles.redPoint);
            mercator.enableSelection(this.state.mapConfig, "currentSamples");
            mercator.zoomMapToLayer(this.state.mapConfig, "currentSamples");

            window.open(this.state.documentRoot + "/geo-dash?editable=false&"
                + encodeURIComponent("title=" + this.state.currentProject.name
                    + "&pid=" + this.props.projectId
                    + "&aoi=[" + mercator.getViewExtent(this.state.mapConfig)
                    + "]&daterange=&bcenter=" + this.state.currentPlot.center
                    + "&bradius=" + this.state.currentProject.plotSize / 2),
                "_geo-dash");
        }
    }
    getPlotData() {
        fetch(this.state.documentRoot + "/get-unanalyzed-plot/" + this.props.projectId)
            .then(response => {
                if (response.ok) {
                    return response.text();
                }
                else {
                    console.log(response);
                    alert("Error retrieving plot data. See console for details.");
                }
            }).then(data=> {
            if (data == "done") {
                this.setState({currentPlot: null});
                // FIXME: What is the minimal set of these that I can execute?
                utils.disable_element("new-plot-button");
                utils.disable_element("flag-plot-button");
                utils.disable_element("save-values-button");
                alert("All plots have been analyzed for this project.");
            } else {
                this.setState({currentPlot: JSON.parse(data)});
                this.loadRandomPlot();
            }
        });
    }
    assignedPercentage() {
        if (this.state.currentProject == null || this.state.stats == null) {
            return "0.00";
        } else {
            return (100.0 * this.state.stats.analyzedPlots / this.state.currentProject.numPlots).toFixed(2);
        }
    }
    flaggedPercentage () {
        if (this.state.currentProject == null || this.state.stats == null) {
            return "0.00";
        } else {
            return (100.0 * this.state.stats.flaggedPlots / this.state.currentProject.numPlots).toFixed(2);
        }
    }
    completedPercentage() {
        if (this.state.currentProject == null || this.state.stats == null) {
            return "0.00";
        } else {
            return (100.0 * (this.state.stats.analyzedPlots + this.state.stats.flaggedPlots) / this.state.currentProject.numPlots).toFixed(2);
        }
    }
    saveValues= () => {
        var ref=this;
        $.ajax({
            url: ref.state.documentRoot + "/add-user-samples",
            type: "POST",
            async: true,
            crossDomain: true,
            contentType: false,
            processData: false,
            data:  JSON.stringify({projectId: ref.props.projectId,
                plotId: ref.state.currentPlot.id,
                userId: ref.props.userName,
                userSamples: ref.state.userSamples})
        }).fail(function () {
            alert("Error saving your assignments to the database. See console for details.");
        }).done(function (data) {
            var statistics=ref.state.stats;
            statistics.analyzedPlots=statistics.analyzedPlots+1;
            ref.setState({stats:statistics});
            ref.nextPlot();
        });
    }
    showProjectMap() {
        this.setState({mapConfig: mercator.createMap("image-analysis-pane", [0.0, 0.0], 1, this.state.imageryList)});
        this.setBaseMapSource();
        // Show the project's boundary
        mercator.addVectorLayer(this.state.mapConfig,
            "currentAOI",
            mercator.geometryToVectorSource(mercator.parseGeoJson(this.state.currentProject.boundary, true)),
            ceoMapStyles.polygon);
        mercator.zoomMapToLayer(this.state.mapConfig, "currentAOI");
        // Draw the project plots as clusters on the map
        this.showProjectPlots();
    }
    initialization() {
        this.getProjectById();
        this.getProjectStats();
        this.getProjectPlots();
        setTimeout(() => {
            if (this.state.imageryList != null && this.state.imageryList.length > 0) {
                this.showProjectMap();
            }
           }, 250);


    }
    render() {

        return(<React.Fragment>
                <ImageAnalysisPane collection={this.state} nextPlot={this.nextPlot}/>
                <div id="sidebar" className="col-xl-3">
                    <SideBar collection={this.state} setBaseMapSource={this.setBaseMapSource} setCurrentValue={this.setCurrentValue} updateDGWMSLayer={this.updateDGWMSLayer}
                             updatePlanetLayer={this.updatePlanetLayer} nextPlot={this.nextPlot} flagPlot={this.flagPlot}
                             assignedPercentage={this.assignedPercentage} flaggedPercentage={this.flaggedPercentage} completedPercentage={this.completedPercentage}
                             saveValues={()=>this.saveValues()} />
                </div>
            </React.Fragment>
        );
    }
}
class ImageAnalysisPane extends React.Component {
    constructor(props) {
        super(props);
        this.state={
            showSideBar : false,
            mapClass : "fullmap",
            quitClass : "quit-full",
            imageryList:this.props.imageryList,
            currentPlot:this.props.collection.currentPlot,
            mapConfig:this.props.collection.mapConfig,
            userSamples : {},
        };
    };
    render() {
        var showSidebar;
        const collection = this.props.collection;
        if (this.state.showSideBar) {
            showSidebar = <div>
                <span id="action-button" name="collection-actioncall" title="Click a plot to analyze:"
                      alt="Click a plot to analyze">Click a plot to analyze, or:<p></p><br/>
                    <span className="button" onClick={this.props.nextPlot}>Analyze random plot</span>
                    <br style={{clear:"both"}}/>
                    <br style={{clear:"both"}}/>
                </span>
            </div>
        }
        else {
            showSidebar = <div style={{position:"relative"}}>
                <span id="action-button" name="collection-actioncall" title="Select each plot to choose value"
                      alt="Select each plot to choose value">Select each dot to choose value
                </span>
            </div>
        }
        return (
            <div id="image-analysis-pane" className="col-xl-9 col-lg-9 col-md-12 pl-0 pr-0 full-height">
                <div className="buttonHolder d-none">
                    {showSidebar}
                </div>
                <div id="imagery-info" className="row d-none">
                    <p className="col small">{collection.currentImagery.attribution}</p>
                </div>
            </div>
        );
    }
}

function SideBar(props){
        console.log("from sidebar");
        console.log(props.collection);
        const collection = props.collection;

        return (
            <React.Fragment>
                <h2 className="header">{collection.currentProject==null?"":collection.currentProject.name}</h2>
                <SideBarFieldSet collection={props.collection} setBaseMapSource={props.setBaseMapSource} setCurrentValue={props.setCurrentValue}
                                 updateDGWMSLayer={props.updateDGWMSLayer} updatePlanetLayer={props.updatePlanetLayer} nextPlot={props.nextPlot} flagPlot={props.flagPlot}/>
                <div className="row">
                    <div className="col-sm-12 btn-block">
                        <button id="save-values-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                                type="button"
                                name="save-values" style={{opacity:"0.5"}} disabled>
                            Save
                        </button>
                        <button className="btn btn-outline-lightgreen btn-sm btn-block mb-1" data-toggle="collapse"
                                href="#project-stats-collapse" role="button" aria-expanded="false"
                                aria-controls="project-stats-collapse">
                            Project Stats
                        </button>
                        <div className="row justify-content-center mb-1 text-center">
                            <div className="col-lg-12">
                                <fieldset id="projStats" className="collection.statClass" className="text-center">
                                    <div className="collapse" id="project-stats-collapse">
                                        <table className="table table-sm">
                                            <tbody>
                                            <tr>
                                                <td className="small">Project</td>
                                                <td className="small">{collection.currentProject==null?"":collection.currentProject.name}</td>
                                            </tr>
                                            <tr>
                                                <td className="small">Plots Assigned</td>
                                                <td className="small">
                                                    {collection.stats==null?"":collection.stats.analyzedPlots}
                                                    ({props.assignedPercentage}%)
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="small">Plots Flagged</td>
                                                <td className="small">
                                                    {collection.stats==null?"":collection.stats.flaggedPlots}
                                                    ({props.flaggedPercentage}%)
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="small">Plots Completed</td>
                                                <td className="small">
                                                    {collection.stats==null?"":collection.stats.analyzedPlots + collection.stats.flaggedPlots}
                                                    ({props.completedPercentage}%)
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="small">Plots Total</td>
                                                <td className="small">{collection.stats==null?"":collection.currentProject.numPlots}</td>
                                            </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </fieldset>
                            </div>
                        </div>
                        <button id="collection-quit-button" className="btn btn-outline-danger btn-block btn-sm"
                                type="button"
                                name="collection-quit" data-toggle="modal"
                                data-target="#confirmation-quit">
                            Quit
                        </button>
                    </div>
                </div>
            </React.Fragment>
        );
}

class SideBarFieldSet extends React.Component {
    constructor(props) {
        super(props);
    };

    render() {
        const collection = this.props.collection;
        var select1, select2;
        var projMap = "";
        var temp = "";
        if (collection.imageryList != null && collection.currentProject != null) {
            temp = <select className="form-control form-control-sm" id="base-map-source" name="base-map-source"
                           size="1" defaultValue={collection.currentProject.baseMapSource}
                           onChange={this.props.setBaseMapSource}>{
                collection.imageryList.map(imagery =>
                    <option value={imagery.title}>{imagery.title}</option>
                )
            }
            </select>;
        }
        if (collection.currentProject != null) {
            projMap = collection.currentProject.sampleValues.map(sampleValueGroup =>
                <fieldset className="mb-1 justify-content-center text-center">
                    <h3 className="text-center">Sample Value: {sampleValueGroup.name}</h3>
                    <ul id="samplevalue" className="justify-content-center">
                        {
                            sampleValueGroup.values.map(sampleValue =>
                                <li className="mb-1">
                                    <button type="button"
                                            className="btn btn-outline-darkgray btn-sm btn-block pl-1"
                                            id={sampleValue.name + '_' + sampleValue.id}
                                            name={sampleValue.name + '_' + sampleValue.id}
                                            onClick={() => this.props.setCurrentValue(sampleValueGroup, sampleValue)}>
                                        <div className="circle" style={{
                                            "background-color": sampleValue.color,
                                            border: "solid 1px",
                                            float: "left",
                                            "margin-top": "4px"
                                        }}></div>
                                        <span className="small">{sampleValue.name}</span>
                                    </button>
                                </li>
                            )
                        }
                    </ul>
                </fieldset>
            )
            if (collection.currentProject.baseMapSource == 'DigitalGlobeWMSImagery') {
                select1 = <React.Fragment><select className="form-control form-control-sm" id="dg-imagery-year"
                                                  name="dg-imagery-year"
                                                  size="1"
                                                  defaultValue ={collection.imageryYearDG}
                                                  onChange={this.props.updateDGWMSLayer}>
                    <option value="2018">2018</option>
                    <option value="2017">2017</option>
                    <option value="2016">2016</option>
                    <option value="2015">2015</option>
                    <option value="2014">2014</option>
                    <option value="2013">2013</option>
                    <option value="2012">2012</option>
                    <option value="2011">2011</option>
                    <option value="2010">2010</option>
                    <option value="2009">2009</option>
                    <option value="2008">2008</option>
                    <option value="2007">2007</option>
                    <option value="2006">2006</option>
                    <option value="2005">2005</option>
                    <option value="2004">2004</option>
                    <option value="2003">2003</option>
                    <option value="2002">2002</option>
                    <option value="2001">2001</option>
                    <option value="2000">2000</option>
                </select>
                    <select className="form-control form-control-sm" id="dg-stacking-profile" name="dg-stacking-profile"
                            size="1"
                            defaultValue={collection.stackingProfileDG} onChange={this.props.updateDGWMSLayer}>
                        <option value="Accuracy_Profile">Accuracy Profile</option>
                        <option value="Cloud_Cover_Profile">Cloud Cover Profile</option>
                        <option value="Global_Currency_Profile">Global Currency Profile</option>
                        <option value="MyDG_Color_Consumer_Profile">MyDG Color Consumer Profile</option>
                        <option value="MyDG_Consumer_Profile">MyDG Consumer Profile</option>
                    </select>
                </React.Fragment>;
            }
            if (collection.currentProject.baseMapSource == 'PlanetGlobalMosaic') {
                select2 = <React.Fragment> <select className="form-control form-control-sm" id="planet-imagery-year"
                                                   name="planet-imagery-year"
                                                   size="1"
                                                   defaultValue={collection.imageryYearPlanet}
                                                   onChange={this.props.updatePlanetLayer}>
                    <option value="2018">2018</option>
                    <option value="2017">2017</option>
                    <option value="2016">2016</option>
                </select>
                    <select className="form-control form-control-sm" id="planet-imagery-month"
                            name="planet-imagery-month" size="1"
                            defaultValue={collection.imageryMonthPlanet} onChange={this.props.updatePlanetLayer}>
                        <option value="01">January</option>
                        <option value="02">February</option>
                        <option value="03">March</option>
                        <option value="04">April</option>
                        <option value="05">May</option>
                        <option value="06">June</option>
                        <option value="07">July</option>
                        <option value="08">August</option>
                        <option value="09">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                    </select></React.Fragment>;
            }
        }

        return (
            <React.Fragment>
                <fieldset className="mb-3 text-center">
                    <h3>Plot Navigation</h3>
                    <div className="row">
                        <div className="col" id="go-to-first-plot">
                            <input id="go-to-first-plot-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                                   type="button"
                                   name="new-plot" defaultValue="Go to first plot" onClick={this.props.nextPlot}/>
                        </div>
                    </div>
                    <div className="row d-none" id="plot-nav">
                        <div className="col-sm-6 pr-2">
                            <input id="new-plot-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                                   type="button"
                                   name="new-plot" defaultValue="Skip" onClick={this.props.nextPlot}/>
                        </div>
                        <div className="col-sm-6 pl-2">
                            <input id="flag-plot-button" className="btn btn-outline-lightgreen btn-sm btn-block"
                                   type="button"
                                   name="flag-plot" defaultValue="Flag Plot as Bad" onClick={this.props.flagPlot}
                                   style={{opacity:"0.5"}} disabled/>
                        </div>
                    </div>
                </fieldset>
                <fieldset className="mb-3 justify-content-center text-center">
                    <h3>Imagery Options</h3>
                    {temp}
                    {select1}
                    {select2}

                </fieldset>
                {projMap}

            </React.Fragment>

        );
    }
}

function renderCollection(documentRoot, username, projectId) {

    ReactDOM.render(
        <Collection documentRoot={documentRoot} userName={username} projectId={projectId}/>,
        document.getElementById("collection")
    );
}

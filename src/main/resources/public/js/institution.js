angular.module("institution", []).controller("InstitutionController", ["$http", function InstitutionController($http) {
    this.pageMode = "view";

    this.details = {
        id: "-1",
        name: "No institution selected",
        logo: "",
        url: "",
        description: ""
    };

    this.getInstitutionDetails = function (institutionId) {
        $http.post("get-institution-details", institutionId)
            .then(angular.bind(this, function successCallback(response) {
                this.details = response.data;
            }), function errorCallback(response) {
                console.log(response);
                alert("Error retrieving the institution details. See console for details.");
            });
    };

    this.initialize = function () {
        // Load the institution details
        var initialInstitutionId = document.getElementById("initial-institution-id").value;
        if (initialInstitutionId != "-1") {
            this.getInstitutionDetails(initialInstitutionId);
        }
    };

    this.updateInstitution = function () {
        var formData = new FormData();
        formData.append("institution-name", this.details.name);
        formData.append("institution-logo", document.getElementById("institution-logo").files[0]);
        formData.append("institution-url", this.details.url);
        formData.append("institution-description", this.details.description);
        $http.post("update-institution/" + this.details.id,
                   formData,
                   {transformRequest: angular.identity,
                    headers: {"Content-Type": undefined}})
            .then(angular.bind(this, function successCallback(response) {
                if (response.data != "") {
                    this.details.logo = response.data;
                }
            }), function errorCallback(response) {
                console.log(response);
                alert("Error updating institution details. See console for details.");
            });
    };

    this.editInstitution = function () {
        if (this.pageMode == "view") {
            this.pageMode = "edit";
        } else {
            this.updateInstitution();
            this.pageMode = "view";
        }
    };

    this.deleteInstitution = function () {
        if (confirm("Do you REALLY want to delete this institution?!")) {
            $http.post("archive-institution", this.details.id)
                .then(angular.bind(this, function successCallback(response) {
                    alert("Institution " + this.details.name + " has been deleted.");
                    window.location="home";
                }), function errorCallback(response) {
                    console.log(response);
                    alert("Error deleting institution. See console for details.");
                });
        }
    };

}]);
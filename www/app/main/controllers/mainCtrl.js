'use strict';

angular.module('appstore').controller('mainCtrl', function ($scope, $rootScope, api, utils) {
  $rootScope.app = null;
  $rootScope.back = {};
  $scope.popular = {};
  $scope.essentials = [];
  $scope.top = [];
  $scope.new = [];
  $scope.counts = {
    applications: null,
    webapps: null,
    scopes: null,
    games: null,
  };
  $scope.appIcon = utils.appIcon;

  function refresh() {
    api.apps({sort: '-points', limit: 12}).then(function(data) {
      $scope.top = data.apps;
    });

    api.apps({sort: '-published_date', limit: 6}).then(function(data) {
      $scope.new = data.apps;
    });

    api.counts().then(function(data) {
      $scope.counts = data;
    });

    api.essentials().then(function(data) {
      $scope.essentials = _.shuffle(data);
    }, function(err) {
      console.error(err);
    });
  }
  refresh();
});
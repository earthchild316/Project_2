var convertPathToArray = require('./path_to_array.js');
var Router = function () {
  this.routes = [];
  this.currentPath = "";
};

Router.prototype.route = function (route) {
  this.routes.push(route);
};

Router.prototype.routeWithPath = function (path) {
  this.currentPath = path;
  this.dynamicValue = "";
  // we need to loop over the input path first
  var newPath = convertPathToArray(path);
  // first match
  var possibleRoutes = this.routes.filter(function (route) {
    return convertPathToArray(route.path)[0] === newPath[0];
  });
  if (possibleRoutes.length === 0) { // no paths found
    return this.getDefaultRoute();
  } else if (possibleRoutes.length === 1) { // just one path matches
    return possibleRoutes[0];
  } else { // multiple matches (look at dynamic routes)
    var result = possibleRoutes.find(function (route) {
      return (convertPathToArray(route.path).length === newPath.length);
    });
    return result;
  }
}

Router.prototype.getDefaultRoute = function () {
  return this.routes.find(function (route) {
    if (route.defaultRoute) {
      this.currentPath = route.path;
      return route.defaultRoute;
    }
  }.bind(this))
};

Router.prototype.loadInitialPage = function (requestedPath) {
  var route = this.routeWithPath(requestedPath);
  if (route.dataPrefix || route.dataPath) {
    this.fetchData(route, function (data) {
        replaceInHistory(route, this.currentPath);
      }.bind(this))
  } else {
    replaceInHistory(route, this.currentPath);
    route.onLoad(null, null, this);
  }
};

Router.prototype.loadNewPage = function (requestedPath) {
  var route = this.routeWithPath(requestedPath);
  if (route.dataPrefix || route.dataPath) {
    this.fetchData(route, function (data) {
        addToHistory(route, this.currentPath);
      }.bind(this), false)
  } else {
    addToHistory(route, this.currentPath);
    route.onLoad(null, null, this);
  }
};

Router.prototype.loadExistingPage = function (routeObjFromHistory) {
  var route = this.routeWithPath(routeObjFromHistory.url);
  if (route.dataPrefix || route.dataPath) {
    this.fetchData(route, null, false)
  } else {
    route.onLoad(null, null, this);
  }
};

Router.prototype.fetchDataNoCache = function (route) {
  this.fetchData(route, this.refreshCache.bind(this, route), true);
};

Router.prototype.fetchData = function (route, callback, disableCache, requestedPath) {
  if (route.data && !disableCache) {
    route.onLoad(route.data, this.refreshCache.bind(this, route), this);
    if (callback) callback(route.data, this.fetchDataNoCache);
  } else {
    var url = route.dataPath || route.dataPrefix + this.currentPath;
    var request = new XMLHttpRequest();
    request.open("GET", url);
    request.onload = function () {
      if (request.status === 200) {
        var result = JSON.parse(request.responseText);
        route.onLoad(result, this.refreshCache.bind(this, route), this);
        route.data = result;
        if (callback) callback(result, this.fetchDataNoCache);
      }
    }.bind(this);
    request.send();
  }
};

Router.prototype.refreshCache = function (route) {
  route.data = null;
  route.url = this.currentPath;
  this.loadExistingPage(route)
}

var formatRouteToSave = function (route, currentPath) {
  return {
    path: route.path,
    data: route.data || null,
    url: currentPath
  }
}

var replaceInHistory = function (route, currentPath) {
  window.history.replaceState(formatRouteToSave(route, currentPath), route.heading, currentPath)
}

var addToHistory = function (route, currentPath) {
  window.history.pushState(formatRouteToSave(route, currentPath), route.heading, currentPath);
}

var replaceDynamicValue = function (requestedPath, matchedPath) {
  var result = [];
  matchedPath.forEach(function (pathVar, index) {
    if (value.indexOf(":") === 0) {
      result.push(requestedPath[index]);
    } else {
      result.push(pathVar);
    }
  })
  return result;
}

var hasColon = function (mem, value) {
  return value.indexOf(":") === 0 ? true : mem;
}


module.exports = Router;
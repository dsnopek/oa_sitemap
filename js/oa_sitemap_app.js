


/**
 * @file
 * Javascript for the OA sitemap.
 */

(function ($) {

  var app = angular.module("oaSitemap", ['ngSanitize', 'ngDraggable']);

  app.controller("oaSitemapController", function($scope, $timeout, $location) {

    var currentID = 0;
    var topID = 0;
    var allSpaces = {};
    var breadcrumbs = [];


    function loadSpace(id) {
      currentID = id;
      var parentId = allSpaces[id].parent_id;
      var currentSpaces = [];

      // if ID has a valid parent space
      var parentSpace = allSpaces[parentId];
      if (parentSpace) {
        for (var i in parentSpace.subspaces) {
          var childSpace = allSpaces[parentSpace.subspaces[i]];
          currentSpaces.push(childSpace);
        }
      }
      // if ID does not have a valid parent i.e. is top level space
      else {
        currentSpaces.push(allSpaces[id]);
      }
      allSpaces[id].editorEnabled = false;

      // need to call CTools to get it to re-attach the modal popup behavior
      // to links *after* our space has been updated
      $timeout( function() {
        $location.hash('');
        $scope.$broadcast('oaSitemapRefresh', id);
      }, 10);

      return currentSpaces;
    }

    function loadBreadCrumbs(id) {
      var parentId = allSpaces[id].parent_id;

      if ((parentId != -1) && (parentId in allSpaces)) {
        breadcrumbs.push(allSpaces[parentId]);
        loadBreadCrumbs(parentId);
      }

      return breadcrumbs;
    }

    function returnSpacePosition (spaces, index) {
      for (var i in spaces) {
        if (spaces[i].nid == index) {
          return parseInt(i);
        }
      }
      return -1;
    }

    function returnDropDownSelects(active, top) {
      var dropDownSelects = [allSpaces[top]];

      function returnChildren(id, active, depth) {
        var subspaces = allSpaces[id].subspaces;
        for (var i in subspaces) {
          var spaceID = subspaces[i];
          allSpaces[spaceID].prefix = new Array(depth+1).join("- ");
          allSpaces[spaceID].classes = spaceID == active ? 'active' : '';
          dropDownSelects.push(allSpaces[spaceID]);
          if (allSpaces[spaceID].subspaces.length > 1) {
            var child = returnChildren(allSpaces[spaceID].nid, active, depth+1);
            if (child) {
              return child;
            }
          }
        }
        return false;
      }
      returnChildren(top, active, 1);
      return dropDownSelects;
    }

    $scope.$on('oaSitemapRefresh', function(event, e) {
      // need to reset ctools since it caches the previous href values on modal links
      $('a.ctools-use-modal').each(function() {
        // get link url without any query string
        var newurl = $(this).attr('href');
        var newlink = newurl.split('?')[0];
        // now need to remove previous ajax assigned to the old url
        for (var base in Drupal.ajax) {
          var link = base.split('?')[0];
          if (newlink == link) {
            //Drupal.ajax[base].url = newurl;
            //Drupal.ajax[base].element_settings.url = newurl;
            Drupal.ajax[base].options.url = newurl;
          }
        }
      });
      // ok, now reattach new ctools ajax to modals
      Drupal.attachBehaviors($('.oa-sitemap'));
    });

    topID = Drupal.settings.oa_sitemap.topID;
    allSpaces = Drupal.settings.oa_sitemap.spaces;

    $scope.allSpaces = allSpaces;
    $scope.spaces = loadSpace(topID);
    $scope.topDropdown = (0 in allSpaces) ? 0 : topID;
    $scope.dropDownSelects = returnDropDownSelects(topID, $scope.topDropdown);
    $scope.editableTitle = {};
    $scope.space = allSpaces[topID];

    $scope.breadcrumbs = loadBreadCrumbs(topID);
    $scope.icons = Drupal.settings.oa_sitemap.icons;
    $scope.currentSlide = returnSpacePosition($scope.spaces, topID);

    $scope.exploreSpace = function(spaceID) {
      if (!allSpaces[spaceID].dragging) {
        breadcrumbs = [];
        $scope.breadcrumbs = loadBreadCrumbs(spaceID);
        $scope.spaces = loadSpace(spaceID);
        $scope.currentSlide = returnSpacePosition($scope.spaces, spaceID);
        $scope.space = allSpaces[spaceID];
        $scope.dropDownSelects = returnDropDownSelects(topID, $scope.topDropdown);
      }
    };

    $scope.slide = function(slide) {
      $scope.currentSlide = parseInt(slide);
      $scope.space = $scope.spaces[$scope.currentSlide];
    };

    $scope.spaceClass = function(spaceID) {
      var className = '';
      if (allSpaces[spaceID].status != 0) {
        className = (allSpaces[spaceID].visibility == 0) ? 'oa-icon-green' : 'oa-icon-red';
      }
      return className;
    };

    $scope.sectionClass = function(section) {
      var className = (section.visibility) ? 'oa-border-green' : 'oa-border-red';
      return className;
    };

    $scope.newSpaceTitle = function(spaceID) {
      return (allSpaces[spaceID].parent_id >= 0) ? Drupal.t('New Subspace') : Drupal.t('New Space');
    };

    $scope.newSpaceClass = function(spaceID) {
      return 'oa-subspace-link ctools-use-modal ctools-modal-oa-sitemap-space';
    };

    $scope.newSpaceURL = function(spaceID) {
      var url = Drupal.settings.basePath + 'api/oa_wizard/add/oa-space';
      if (spaceID > 0) {
        url = url + '?oa_parent_space=' + spaceID;
      }
      return url;
    };

    $scope.newSectionTitle = function(spaceID) {
      return Drupal.t('New Section');
    };

    $scope.newSectionClass = function(spaceID) {
      return 'oa-section-link ctools-use-modal ctools-modal-oa-sitemap-section';
    };

    $scope.newSectionURL = function(spaceID) {
      var url = Drupal.settings.basePath + 'api/oa_wizard/add/oa-section';
      if (spaceID > 0) {
        url = url + '?og_group_ref=' + spaceID;
      }
      return url;
    };

    $scope.deleteSubspace = function(space, nid) {
      if ((allSpaces[nid].sections.length > 0) || (allSpaces[nid].subspaces.length > 0)) {
        alert('Can only delete empty spaces.');
        return;
      }
      if (confirm('Are you sure you wish to delete "' + allSpaces[nid].title + '" ?')) {
        //TODO: drupal ajax callback to delete a node
        var index = space.subspaces.indexOf(nid);
        $.post(
          // Callback URL.
          Drupal.settings.basePath + 'api/oa/sitemap-delete/' + nid,
          {},
          function( result ) {
            if ((result.length > 0) && (result[1].command == 'alert')) {
              alert(result[1].text);
            }
            else {
              if (index > -1) {
                space.subspaces.splice(index, 1);
              }
              delete allSpaces.nid;
              $scope.$apply();
            }
        });
      }
    };

    $scope.deleteSection = function(space, section) {
      if (confirm('Are you sure you wish to delete "' + section.title + '" ?')) {
        //TODO: drupal ajax callback to delete a node
        var index = space.sections.indexOf(section);
        $.post(
          // Callback URL.
          Drupal.settings.basePath + 'api/oa/sitemap-delete/' + section.nid,
          {},
          function( result ) {
            if ((result.length > 0) && (result[1].command == 'alert')) {
              alert(result[1].text);
            }
            else {
              if (index > -1) {
                space.sections.splice(index, 1);
              }
              $scope.$apply();
            }
          });
      }
    };

    $scope.enableEditor = function(node) {
      $scope.editableTitle[node.nid] = node.title;
      allSpaces[node.nid].editorEnabled = true;
    };

    $scope.disableEditor = function(node) {
      allSpaces[node.nid].editorEnabled = false;
    };

    $scope.saveTitle = function(node) {
      var oldTitle = node.title;
      node.title = $scope.editableTitle[node.nid];
      $scope.disableEditor(node);
      $.post(
        // Callback URL.
        Drupal.settings.basePath + 'api/oa/sitemap-update/' + node.nid,
        {'node': node},
      function( result ) {
        if ((result.length > 0) && (result[1].command == 'alert')) {
          // undo local change and report error
          node.title = oldTitle;
          $scope.$apply();
          alert(result[1].text);
        }
      });
    };

    $scope.editURL = function(node) {
      return node.url_edit + '?destination=' + document.URL;
    };

    $scope.onDropOnSpace = function(data, spaceID, evt){
      if (data.nid != spaceID) {
        // dropping a space or section on a space
        var oldParent = data.parent_id;
        data.parent_id = spaceID;
        $.post(
          // Callback URL.
          Drupal.settings.basePath + 'api/oa/sitemap-update/' + data.nid,
          {'node': data},
          function( result ) {
            if ((result.length > 0) && (result[1].command == 'alert')) {
              // failed, so undo
              data.parent_id = oldParent;
              $scope.$apply();
              alert(result[1].text);
            }
            else {
              if (data.type == 'oa_space') {
                var oldIndex = allSpaces[oldParent].subspaces.indexOf(data.nid);
                allSpaces[oldParent].subspaces.splice(oldIndex, 1);
                allSpaces[spaceID].subspaces.push(data.nid);
              }
              else {
                var oldIndex = $scope.space.sections.indexOf(data);
                allSpaces[$scope.space.nid].sections.splice(oldIndex, 1);
                allSpaces[spaceID].sections.push(data);
              }
              $scope.$apply();
            }
          });
      }
    };

    $scope.onDropOnSpaceList = function(data, index, spaceID, evt){
      if (data.nid != spaceID) {
        // don't drop over itself
        console.log("drop SPACELIST " + spaceID + " success, index: " + index + " data:", data);
        // reordering subspaces
      }
    };

    $scope.onDropOnSection = function(data, index, section, evt){
      if (!angular.equals(data,section)) {
        // don't drop over itself
        console.log("drop SECTION " + index + " success, data:", data);
        // reordering sections
      }
    };

    $(document).on('oaWizardNew', function(event, node) {
      // respond to event message from submitting oa_wizard form
      switch (node.type) {
        case 'oa_section':
          var parentID = node.og_group_ref.und[0].target_id;
          if (allSpaces[parentID]) {
            allSpaces[parentID].sections.push({
              'title': node.title,
              'url': Drupal.settings.basePath + 'node/' + node.nid,
              'visibility': (node.field_oa_group_ref.und.length == 0) &&
                node.field_oa_team_ref.und.length == 0 &&
                node.field_oa_user_ref.und.length == 0,
              'admin': allSpaces[parentID].admin,
              'icon_id': node.field_oa_section.und[0].tid
            });
            console.log(node);
            $scope.spaces = loadSpace(currentID);
            $scope.$apply();
          }
          break;
        case 'oa_space':
          console.log(node);
          var parentID = (node.oa_parent_space == undefined) ? 0 : node.oa_parent_space.und[Object.keys(node.oa_parent_space.und)[0]].target_id;
          allSpaces[node.nid] = {
            'nid': node.nid,
            'parent_id': parentID,
            'title': node.title,
            'status': node.status,
            'visibility': node.group_access.und[0].value,
            'admin': allSpaces[parentID].admin,
            'url': Drupal.settings.basePath + 'node/' + node.nid,
            'url_edit': Drupal.settings.basePath + 'node/' + node.nid + '/edit',
            'new_space': allSpaces[parentID].new_space,
            'new_section': (parentID == 0) ? allSpaces[parentID].new_space : allSpaces[parentID].new_section,
            'sections': [],
            'subspaces': []
          };
          allSpaces[parentID].subspaces.push(node.nid);
          console.log(allSpaces[node.nid]);
          $scope.exploreSpace(currentID);
          $scope.$apply();
          break;
      }
    });

  });

  Drupal.behaviors.oaSitemap = {
    attach: function(context, settings) {
    }
  }

}(jQuery));

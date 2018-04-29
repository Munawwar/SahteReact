(function () {

  function slice(arrayLike) {
    return Array.prototype.slice.call(arrayLike);
  }

  function correctDOMStateForRemovedAttribute(el, attrName) {
    if (attrName === 'disabled') {
      el.disabled = false;
    } else if (attrName === 'value') {
      el.value = '';
    } else if (attrName === 'checked') {
      el.checked = false;
    }
  }

  function correctDOMStateForAddedAttribute(el, attrName, attrValue) {
    if (attrName === 'disabled') {
      el.disabled = true;
    } else if (attrName === 'value') {
      el.value = attrValue;
    } else if (attrName === 'checked') {
      el.checked = true;
    }
  }

  //Algo 1 - Here index of both arrays are incremented when unequal
  //Good for detecting appends and pops(). For arrays of equal length this would be good to detect replace ops.
  function nodeDiff1(n, o) {
    var i, j; //i is for n's index and j for o's index

    var changes = [];
    for (i = 0, j = 0; i < n.length && j < o.length; i += 1, j += 1) {
      if (n[i].nodeType === o[j].nodeType && (n[i].nodeType !== 1 || n[i].nodeName === o[j].nodeName)) {
        changes.push({
            replace: true,
            op: 'replace',
            value: n[i],
            index: j
        });
      }
    }
    for (; i < n.length; i += 1) { //if more items from n remains
      changes.push({
        insert : true,
        op: 'insert',
        value: n[i],
        index: i
      });
    }
    for (var end = j; j < o.length; j += 1) { //if more items from o remains
      changes.push({
        remove : true,
        op: 'remove',
        value: o[j],
        index: end
      });
    }

    return changes;
  }
  //Algo 2 - Here index of new array is incremented when unequal
  //Good for detecting a newly added item
  function nodeDiff2(n, o) {
    var i, j; //i is for n's index and j for o's index

    var changes = [],
      d = 0; // "displacement". The difference between j and index of insertion or deletion.
    for (i = 0, j = 0; i < n.length && j < o.length; ) {
      if (n[i].nodeType === o[j].nodeType && (n[i].nodeType !== 1 || n[i].nodeName === o[j].nodeName)) {
        i += 1;
        j += 1;
      } else {
        changes.push({
          insert: true,
          op: "insert",
          value: n[i],
          index: j + d
        });
        d += 1;
        i += 1;
      }
    }
    for (; i < n.length; i += 1) {
      //if more items from n remains
      changes.push({
        insert: true,
        op: "insert",
        value: n[i],
        index: j + d
      });
      d += 1;
    }
    for (; j < o.length; j += 1) {
      //if more items from o remains
      changes.push({
        remove: true,
        op: "remove",
        value: o[j],
        index: j + d
      });
      d -= 1;
    }

    return changes;
  }
  //Algo 3 - Here index of old array is incremented when unequal
  //Good for detecting a removed item
  function nodeDiff3(n, o) {
    var i, j; //i is for n's index and j for o's index

    var changes = [],
      d = 0; // "displacement". The difference between j and index of insertion or deletion.
    for (i = 0, j = 0; i < n.length && j < o.length; ) {
      if (n[i].nodeType === o[j].nodeType && (n[i].nodeType !== 1 || n[i].nodeName === o[j].nodeName)) {
        i += 1;
        j += 1;
      } else {
        changes.push({
          remove: true,
          op: "remove",
          value: o[j],
          index: j + d
        });
        d -= 1;
        j += 1;
      }
    }
    for (; i < n.length; i += 1) {
      //if more items from n remains
      changes.push({
        insert: true,
        op: "insert",
        value: n[i],
        index: j + d
      });
      d += 1;
    }
    for (; j < o.length; j += 1) {
      //if more items from o remains
      changes.push({
        remove: true,
        op: "remove",
        value: o[j],
        index: j + d
      });
      d -= 1;
    }

    return changes;
  }

  // Chooses the changes from the alogirthm that returns least changes.
  // Computational complexity is  O(3 * (n.length + o.length)) ~ O(N)  - where N is sum of lengths.
  // Best time is O(n.length + o.length) (when arrays are equal).
  // n is the new node list and o is the old node list
  function diff(n, o) {
    var diff2 = nodeDiff2(n, o);
    if (diff2.length <= 1 || !o.length || !n.length) {
      return diff2;
    }

    var diff3 = nodeDiff3(n, o);
    if (diff3.length <= 1) {
      return diff3;
    }

    var changesFromDiffAlgos = [diff2, diff3, nodeDiff1(n, o)];

    var leastChanges;
    changesFromDiffAlgos.forEach(function(changes) {
      if (!leastChanges || changes.length < leastChanges.length) {
        leastChanges = changes;
      }
    });
    return leastChanges;
  }

  function patch(el, changes) {
    changes.forEach(function(change) {
      if (change.replace) {
        el.replaceChild(change.value, el.childNodes[change.index]);
        // o.splice(change.index, 1, change.value);
      } else if (change.insert) {
        el.insertBefore(change.value, el.childNodes[change.index + 1]);
        // o.splice(change.index, 0, change.value);
      } else {
        // o.splice(change.index, 1);
        el.removeChild(el.childNodes[change.index]);
      }
    });
    return el;
  }


  /**
   * Sync (DOM diff and patch) target element to be same as source element.
   *
   * Algorithm optimises document.createElement() calls, since it is the heaviest DOM
   * operation AFAIK.
   *
   * TODO: In future, optimize sorting lists (with keys).
   */
  window.domPatch = function (sourceNode, targetNode) {
    if (sourceNode.nodeType !== targetNode.nodeType || (sourceNode.nodeType === 1 && sourceNode.nodeName !== targetNode.nodeName)) {
      return targetNode.parentNode.replaceChild(sourceNode, targetNode);
    }
    // Should only reach here if both nodes are of same type.
    if (sourceNode.nodeType === 1) { // HTMLElements
      // Sync attributes
      // Remove any attributes not in source
      var i = targetNode.attributes.length - 1, len, item;
      for (; i >= 0; i -= 1) {
        item = targetNode.attributes.item(i);
        if (!sourceNode.attributes.getNamedItem(item.name)) {
          targetNode.attributes.removeNamedItem(item.name);
          correctDOMStateForRemovedAttribute(targetNode, item.name);
        }
      }
      // update the rest
      for (i = 0, len = sourceNode.attributes.length; i < len; i += 1) {
        item = sourceNode.attributes.item(i);
        targetNode.setAttribute(item.name, item.value); // browser optimizes if update isn't needed.
        correctDOMStateForAddedAttribute(targetNode, item.name, item.value);
      }

      // Sync nodes' type and remove extra nodes.
      var changes = diff(sourceNode.childNodes, targetNode.childNodes);
      // keep copy of source childNodes as patch() would move some DOM elements to target.
      var sourceChildNodes = slice(sourceNode.childNodes);
      patch(targetNode, changes);
      // recursively sync their attributes and their childNodes
      for (i = 0, len = sourceChildNodes.length; i < len; i += 1) {
        if (sourceChildNodes[i] !== targetNode.childNodes[i]) {
          window.domPatch(sourceChildNodes[i], targetNode.childNodes[i]);
        }
      }
    } else if (sourceNode.nodeType === 3 || sourceNode.nodeType === 8) { // text and comment nodes
      targetNode.nodeValue = sourceNode.nodeValue;
    }
  };
}());

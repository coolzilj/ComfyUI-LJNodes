import { app } from "../../scripts/app.js";

app.registerExtension({
  name: "Comfy.LJNodes.UIHelpers",

  async nodeCreated(node, app) {
    let orig_dblClick = node.onDblClick;
    node.onDblClick = function (e, pos, self) {
      orig_dblClick?.apply?.(this, arguments);
      if(pos[1] > 0) return;
      let prompt = window.prompt("Title", this.title);
      if (prompt) { this.title = prompt; }
    }
  },
});

function clickedOnGroupTitle(e, group) {
  const pos = group.pos;
  const size = group.size;
  const font_size = group.font_size || LiteGraph.DEFAULT_GROUP_FONT_SIZE;
  const height = font_size * 1.4;
  if (LiteGraph.isInsideRectangle(e.canvasX, e.canvasY, pos[0], pos[1], size[0], height)) {
    return true;
  }
  return false;
}

let lastClickedTime;
const processMouseDown = LGraphCanvas.prototype.processMouseDown;
LGraphCanvas.prototype.processMouseDown = function (e) {
  const currentTime = new Date().getTime();
  if (lastClickedTime && (currentTime - lastClickedTime) < 300) {
    lastClickedTime = null;

    this.adjustMouseEvent(e);
    this.selected_group = this.graph.getGroupOnPos(e.canvasX, e.canvasY);
    if (this.selected_group) {
      const group = this.selected_group;
      const clickedOnTitle = clickedOnGroupTitle(e, group);
      if (clickedOnTitle) {
        let prompt = window.prompt("Title", group.title);
        if (prompt) { group.title = prompt; }
        this.allow_searchbox = false;
        const returnVal = processMouseDown.apply(this, [...arguments]);
        this.selected_group = null;
        this.dragging_canvas = false;
        return returnVal;
      }
    }
    this.allow_searchbox = true;
    return processMouseDown.apply(this, [...arguments]);
  } else {
    lastClickedTime = currentTime;
    this.allow_searchbox = true;
    return processMouseDown.apply(this, [...arguments]);
  }
};

const origProcessKey = LGraphCanvas.prototype.processKey;
LGraphCanvas.prototype.processKey = function(e) {
  if (!this.graph) {
    return;
  }

  var block_default = false;

  if (e.target.localName == "input") {
    return;
  }

  if (e.type == "keydown" && !e.repeat) {
    // Ctrl + G, Add Group For Selected Nodes
    if (e.key === 'g' && e.ctrlKey) {
      if (Object.keys(app.canvas.selected_nodes || {}).length) {
        var group = new LiteGraph.LGraphGroup();
        addNodesToGroup(group, this.selected_nodes)
        app.canvas.graph.add(group);
        this.graph.change();
      }
      block_default = true;
    }
  }

  this.graph.change();

  if (block_default) {
    e.preventDefault();
    e.stopImmediatePropagation();
    return false;
  }

  // Fall through to Litegraph defaults
  return origProcessKey.apply(this, arguments);
};

function addNodesToGroup(group, nodes=[]) {
  var x1, y1, x2, y2;
  var nx1, ny1, nx2, ny2;
  var node;

  x1 = y1 = x2 = y2 = -1;
  nx1 = ny1 = nx2 = ny2 = -1;

  for (var n of [group._nodes, nodes]) {
      for (var i in n) {
          node = n[i]

          nx1 = node.pos[0]
          ny1 = node.pos[1]
          nx2 = node.pos[0] + node.size[0]
          ny2 = node.pos[1] + node.size[1]

          if (node.type != "Reroute") {
              ny1 -= LiteGraph.NODE_TITLE_HEIGHT;
          }

          if (node.flags?.collapsed) {
              ny2 = ny1 + LiteGraph.NODE_TITLE_HEIGHT;

              if (node?._collapsed_width) {
                  nx2 = nx1 + Math.round(node._collapsed_width);
              }
          }

          if (x1 == -1 || nx1 < x1) {
              x1 = nx1;
          }

          if (y1 == -1 || ny1 < y1) {
              y1 = ny1;
          }

          if (x2 == -1 || nx2 > x2) {
              x2 = nx2;
          }

          if (y2 == -1 || ny2 > y2) {
              y2 = ny2;
          }
      }
  }

  var padding = 10;

  y1 = y1 - Math.round(group.font_size * 1.4);

  group.pos = [x1 - padding, y1 - padding];
  group.size = [x2 - x1 + padding * 2, y2 - y1 + padding * 2];
}

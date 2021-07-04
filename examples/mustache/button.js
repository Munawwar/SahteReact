if (!!!mustacheTemplates) var mustacheTemplates = {};
mustacheTemplates["button"] = new Hogan.Template({code: function (c,p,i) { var t=this;t.b(i=i||"");t.b("<button on-click=\"onClick\">");t.b("\n" + i);t.b("  <span ref=\"spanEl\">");t.b(t.v(t.f("text",c,p,0)));t.b("</span>");t.b("\n" + i);t.b("</button>");return t.fl(); },partials: {}, subs: {  }});


define([
	"dojo/_base/declare",
	"qface/utils/script/js/JSExpression",
], function(declare, JSExpression) {

return declare(JSExpression, {

	/**
	 * @class PrefixPostfixExpression
	 * @extends Expression
	 * @constructor
	 */
	constructor: function() {
		this.isPrefix = false;
		this.expr = null;
		this.operator = null;
		this.elementType = "JSPrefixPostfixExpression";
	},

	getText: function(context) {
		var s = "";
		if (this.comment) {
			s += this.printNewLine(context) + this.comment.getText(context);
		}
		if (this.label) {
			s += this.printNewLine(context) + this.label.getText(context);
		}
		if (this.isPrefix)
			s = s + this.operator;
		s = s + this.expr.getText(context);
		if (!this.isPrefix)
			s = s + this.operator;
		return s;
	},

	visit: function(visitor) {
		var dontVisitChildren;
		dontVisitChildren = visitor.visit(this);
		if (!dontVisitChildren) {
			this.expr.visit(visitor);
		}
		if (visitor.endVisit) {
			visitor.endVisit(this);
		}
	}

});
});

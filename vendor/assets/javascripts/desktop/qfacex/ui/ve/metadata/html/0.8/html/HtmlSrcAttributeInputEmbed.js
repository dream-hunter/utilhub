define("maq-metadata-html/html/HtmlSrcAttributeInputEmbed", [
	"dojo/_base/declare",
	"./HtmlSrcAttributeInput"
], function(declare, HtmlSrcAttributeInput){

return declare(HtmlSrcAttributeInput, {

	constructor: function(/*Object*/args) {
		this.supportsAltText = false;
	}
});
});
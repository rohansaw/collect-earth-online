<#include "header.ftl">
<#include "navbar.ftl">
<#include "announcements.ftl">
<#include "start-content.ftl">
<div id="home"></div>
<script type="text/javascript" src="${root}/js/home.bundle.js"></script>
<script type="text/javascript">
 window.onload = function () {
     home.renderHomePage({
         documentRoot: "${root}",
         userId:       "${userid}",
         userName:     "${username}"
     });
 };
</script>
<#include "end-content.ftl">
<#include "footer.ftl">

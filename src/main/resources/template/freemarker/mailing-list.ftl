<#include "header.ftl">
<#include "navbar.ftl">
<#include "start-content.ftl">

<section id="content" class="container-fluid">
    <div class="row justify-content-center">
        <div class="col-xl-6 col-lg-8 border bg-lightgray mb-5">
            <div class="bg-darkgreen mb-3 no-container-margin">
                <h1>Mailing List!</h1>
            </div>
            <div class="row mb-3">
                <div class="col">
                    <form action="${root}/mailing-list" method="post">
                        <div class="form-group">
                            <label for="email">Subject</label>
                            <input autocomplete="off" id="subject" name="subject" placeholder="Subject" type="text" class="form-control" value="">
                        </div>
                        <div class="form-group">
                            <label for="email">Body</label>
                            <div id="editor"></div>
                        </div>
                        <input class="btn btn-outline-lightgreen btn-block" type="submit">
                    </form>
                </div>
            </div>
        </div>
    </div>
</section>

<script type="text/javascript">
    ClassicEditor.create(document.querySelector('#editor')).catch(error => {
        console.error(error);
    });
</script>

<#include "end-content.ftl">
<#include "footer.ftl">

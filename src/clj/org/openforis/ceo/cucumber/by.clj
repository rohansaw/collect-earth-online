(ns org.openforis.ceo.cucumber.by
  (:import [org.openqa.selenium By]))

(defn css [css-string]
  (By/cssSelector css-string))

(defn id [id-string]
  (By/id id))



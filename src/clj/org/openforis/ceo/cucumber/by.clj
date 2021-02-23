(ns org.openforis.ceo.cucumber.by
  (:import [org.openqa.selenium By]))

(defn name [el-name]
  (By/name el-name))

(defn- class [class-name]
  (By/className class-name))

(defn- css [css-string]
  (By/cssSelector css-string))

(defn- id [id-string]
  (By/id id))



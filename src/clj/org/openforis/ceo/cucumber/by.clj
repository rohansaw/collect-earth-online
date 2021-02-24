(ns org.openforis.ceo.cucumber.by
  (:import [org.openqa.selenium By]))

(defn class-name [s]
  (By/className s))

(defn css [s]
  (By/cssSelector s))

(defn id [s]
  (By/id s))

(defn input-name
  "Select using an input's `name` attribute."
  [s]
  (By/name s))

(defn link-text [s]
  (By/linkText s))

(defn partial-link-text [s]
  (By/partialLinkText s))

(defn tag-name [s]
  (By/tagName s))

(defn xpath [s]
  (By/xpath s))

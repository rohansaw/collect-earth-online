(ns org.openforis.ceo.cucumber.steps
  (:require [org.openforis.ceo.cucumber.by :as by]
            [org.openforis.ceo.cucumber.webdriver :as w]))

(def all-steps (atom []))

;; Private

(defn- step-maker [phrase f]
  (swap! all-steps conj {:match phrase :steps f}))

(defn- Given [phrase f]
  (step-maker (re-pattern (str "^Given " phrase)) f))

(defn- When [phrase f]
  (step-maker (re-pattern (str "^When " phrase)) f))

(defn- Then [phrase f]
  (step-maker (re-pattern (str "^Then " phrase)) f))

;; Public
(defn find-step [step-name]
  {:step-name step-name :fun (fn [_] (println "Hello World"))})
  ;;(filter #(re-matches (:match %) step-definition) @all-steps)

;; Steps

(Given "I am a Visitor"
      (fn [_] (println "Visitor")))

(When "When I login"
      (fn [_] (println "Logging in")))

(Then "I can see my institutions"
      (fn [_] (println "All the institutions")))

(comment (When "I go to login"
      (fn [{:keys [driver]}]
        (let [wait (w/wait driver 10)]
          (.until wait (w/presence-of (by/css "input.form-control")))
          (w/send-keys (by/css "input.form-control") "derp")
          (w/click (w/find-el driver (by/css ".btn.btn-lightgreen")))))))

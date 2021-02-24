(ns org.openforis.ceo.cucumber.steps
  (:require [org.openforis.ceo.cucumber.by :as by]
            [org.openforis.ceo.cucumber.webdriver :as w]))

(def all-steps (atom []))

;; Private

(defn- step-maker [phrase f]
  (swap! all-steps conj {:match (re-pattern phrase) :fun f}))

(defn- Given [phrase f]
  (step-maker phrase f))

(defn- When [phrase f]
  (step-maker phrase f))

(defn- Then [phrase f]
  (step-maker phrase f))

(defn- unknown-def [step-name]
  (fn [_]) (println "Could not find definition for: '" step-name "'"))

;; Public
(defn find-step [step-name]
  (let [step-defs (filter #(re-find (:match %) step-name) @all-steps)
        fun (-> (or (first step-defs) {}) (get :fun (unknown-def step-name)))]
    {:step-name step-name :fun fun}))

;; Steps

(Given "I am a visitor"
      (fn [{:keys [driver]}] (println "Visitor" driver)))

(When "I login"
      (fn [_] (println "Logging in")))

(Then "I can see my institutions"
      (fn [_] (println "All the institutions")))

(comment (When "I go to login"
      (fn [{:keys [driver]}]
        (let [wait (w/wait driver 10)]
          (.until wait (w/presence-of (by/css "input.form-control")))
          (w/send-keys (by/css "input.form-control") "derp")
          (w/click (w/find-el driver (by/css ".btn.btn-lightgreen")))))))

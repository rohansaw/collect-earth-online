(ns collect-earth-online.generators.clj-point
  (:require [triangulum.type-conversion :as tc]
            [collect-earth-online.utils.project    :refer [check-plot-limits check-sample-limits]]
            [collect-earth-online.utils.geom       :refer [make-wkt-point EPSG:3857->4326 EPSG:4326->3857]]
            [collect-earth-online.utils.part-utils :refer [init-throw]]))

;;; Helpers

(defn- distance [x1 y1 x2 y2]
  (Math/sqrt (+ (Math/pow (- x2 x1) 2.0)
                (Math/pow (- y2 y1) 2.0))))

(defn- pad-bounds [left bottom right top buffer]
  [(+ left buffer) (+ bottom buffer) (- right buffer) (- top buffer)])

(defn- filter-circle [circle? center-x center-y radius buffer coll]
  (if circle?
    (filter (fn [[x y]]
              (< (distance center-x center-y x y)
                 (- radius buffer)))
            coll)
    coll))

(defn- random-num [offset size]
  (+ offset
     (* (Math/random) size)))

;;; Gridded

(defn- count-gridded-points [left bottom right top spacing]
  (let [x-range (- right left)
        y-range (- top bottom)
        x-steps (+ (Math/floor (/ x-range spacing)) 1)
        y-steps (+ (Math/floor (/ y-range spacing)) 1)]
    (* x-steps y-steps)))

(defn- get-all-gridded-points [left bottom right top spacing]
  (let [x-range   (- right left)
        y-range   (- top bottom)
        x-steps   (Math/floor (/ x-range spacing))
        y-steps   (Math/floor (/ y-range spacing))
        x-padding (/ (- x-range (* x-steps spacing)) 2.0)
        y-padding (/ (- y-range (* y-steps spacing)) 2.0)]
    (for [x (range (inc x-steps))
          y (range (inc y-steps))]
      [(+ (* x spacing) left x-padding) (+ (* y spacing) bottom y-padding)])))

(defn- create-gridded-plots-in-bounds [left bottom right top spacing]
  (->> (get-all-gridded-points left bottom right top spacing)
       (map EPSG:3857->4326)))

(defn- create-gridded-sample-set [circle? center-x center-y radius buffer sample-resolution]
  (let [[left bottom right top] (pad-bounds (- center-x radius)
                                            (- center-y radius)
                                            (+ center-x radius)
                                            (+ center-y radius)
                                            buffer)]
    (->> (get-all-gridded-points left bottom right top sample-resolution)
         (filter-circle circle? center-x center-y radius buffer)
         (map EPSG:3857->4326))))

;;; Random

(defn- random-point-in-bounds [left bottom right top]
  [(random-num left (- right left)) (random-num bottom (- top bottom))])

(defn- random-point-in-circle [center-x center-y radius]
  (let [r     (* radius (Math/sqrt (Math/random)))
        theta (* (Math/random) 2 Math/PI)]
    [(+ center-x (* r (Math/cos theta))) (+ center-y (* r (Math/sin theta)))]))

(defn- gen-random-points [num-plots spacing point-gen-fn]
  (let [max-iterations (* 2 num-plots)]
    (loop [points     []
           iterations 0]
      (cond
        (>= (count points) num-plots)
        points

        (> iterations max-iterations)
        (init-throw "Unable to generate random plots.  Try a lower number of plots, smaller plot size, or bigger area.")

        :else
        (let [test-point (point-gen-fn)]
          (recur (if (some (fn [[x1 y1]]
                             (let [[x2 y2] test-point
                                   dist (distance x1 y1 x2 y2)]
                               (< dist spacing)))
                           points)
                   points
                   (conj points test-point))
                 (inc iterations)))))))

(defn- create-random-plots-in-bounds [left bottom right top plot-size num-plots]
  (->> (gen-random-points num-plots
                          (* 2.0 plot-size)
                          #(random-point-in-bounds left bottom right top))
       (map EPSG:3857->4326)))

(defn- create-random-sample-set [circle? center-x center-y radius spacing samples-per-plot]
  (let [[left bottom right top] (pad-bounds (- center-x radius)
                                            (- center-y radius)
                                            (+ center-x radius)
                                            (+ center-y radius)
                                            spacing)] ; Add buffer = spacing
    (->> (gen-random-points samples-per-plot
                            spacing
                            (if circle?
                              #(random-point-in-circle center-x center-y (- radius spacing)) ; Add buffer = spacing
                              #(random-point-in-bounds left bottom right top)))
         (map EPSG:3857->4326))))

(defn generate-point-samples [plots
                              plot-count
                              plot-shape
                              plot-size
                              sample-distribution
                              samples-per-plot
                              sample-resolution]
  (let [circle?          (= plot-shape "circle")
        radius           (/ plot-size 2.0)
        buffer           (/ radius 25.0)
        samples-per-plot (case sample-distribution
                           "gridded" (count (create-gridded-sample-set
                                             circle?
                                             45
                                             45
                                             radius
                                             buffer
                                             sample-resolution))
                           "random"  samples-per-plot
                           "center"  1.0
                           "none"    1.0)]
    (check-sample-limits (* plot-count samples-per-plot)
                         50000.0
                         samples-per-plot
                         200.0)
    (mapcat (fn [{:keys [plot_id visible_id lon lat]}]
              (let [[center-x center-y] (EPSG:4326->3857 [lon lat])
                    visible-offset      (-> (dec visible_id)
                                            (* samples-per-plot)
                                            (inc))]
                (map-indexed (fn [idx [sample-lon sample-lat]]
                               {:plot_rid    plot_id
                                :visible_id  (+ idx visible-offset)
                                :sample_geom (tc/str->pg (make-wkt-point sample-lon sample-lat) "geometry")})
                             (cond
                               (= "center" sample-distribution)
                               [[lon lat]]

                               (= "gridded" sample-distribution)
                               (create-gridded-sample-set circle? center-x center-y radius buffer sample-resolution)

                               (= "random" sample-distribution)
                               (create-random-sample-set circle? center-x center-y radius buffer samples-per-plot)

                               :else []))))
            plots)))

(defn generate-point-plots [project-id
                            lon-min
                            lat-min
                            lon-max
                            lat-max
                            plot-distribution
                            num-plots
                            plot-spacing
                            plot-size]
  (let [[[left bottom] [right top]] (EPSG:4326->3857 [lon-min lat-min] [lon-max lat-max])
        [left bottom right top]     (pad-bounds left bottom right top (/ plot-size 2.0))]
    (check-plot-limits (if (= "gridded" plot-distribution)
                         (count-gridded-points left bottom right top plot-spacing)
                         num-plots)
                       5000.0)
    (map-indexed (fn [idx [lon lat]]
                   {:project_rid project-id
                    :visible_id  (inc idx)
                    :plot_geom   (tc/str->pg (make-wkt-point lon lat) "geometry")})
                 (if (= "gridded" plot-distribution)
                   (create-gridded-plots-in-bounds left bottom right top plot-spacing)
                   (create-random-plots-in-bounds left bottom right top plot-size num-plots)))))

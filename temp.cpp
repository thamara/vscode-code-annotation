#include "ros/ros.h"
//#include "geometry_msgs/Vector3Stamped.h"
//#include "geometry_msgs/Vector3.h"
//#include "geometry_msgs/Transform.h"
//#include "geometry_msgs/TransformStamped.h"
#include <tf/transform_datatypes.h>
//#include <tf2_geometry_msgs/tf2_geometry_msgs.h>
//#include <tf/transform_listener.h>
//#include <tf/transform_broadcaster.h>
//#include <tf2/buffer_core.h>
#include "../geometry2/tf2/include/tf2/time.h"
#include <cmath>
/*
When echoing the coordinates of a transform, tf2 first checks if the transform is available. 
The timeout to check the transform is intended to be 1 second, but due to a 
constructor misunderstanding, the user supplies a value of 1 nanosecond.
*/
int main(int argc, char **argv){
    ros::init(argc, argv, " ");
    ros::NodeHandle node;  
    //tf::Vector3 v3(3,2,1);
    /*
    636
    durations.push_back(tf2::Duration(1.0));
    */
    /*
    974
    durations.push_back(tf2::Duration(1.0));

    (and so on)
    */

    //Two ways:
    //1
    //Declare a Global Time Space (and bind a standard frame)
    //Declare measurement systems: an SI system and an SI system with nanoseconds

    /*Annotate this list with a type constraint stating that all values emplaced or used must
    be in the global time space/standard frame and have units in seconds
    */
    std::vector<tf2::Duration> durations;
    //Annotate the duration as having an interpretation in nanoseconds
    //A constraint is generated in Lean, which enforces the unit of measurement
    //This assertion fails, as the units do not match and the constraint is unsatisfied. 
    durations.push_back(tf2::Duration(1.0));

    //2
    //Declare a Global Time Space (and bind a standard frame)
    //Declare measurement systems: an SI system and an SI system with nanoseconds

    /*Annotate this list with a type constraint stating that all values emplaced or used must
    be in the global time space/standard frame and have units in seconds
    */
    //std::vector<tf2::Duration> durations;
    //Annotate the duration as having an interpretation in nanoseconds
    //A constraint is generated in Lean, which enforces the unit of measurement
    //This assertion fails, as the units do not match and the constraint is unsatisfied. 
    //durations.push_back(tf2::Duration(1.0));

}
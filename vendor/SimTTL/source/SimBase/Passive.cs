// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Linq;


namespace SimBase
{
    /// <summary>
    /// A special 2-pin bAseElement class for resistors, capacitors, inductors and diodes.
    /// </summary>
    public class Passive2Pin : BaseElement
    {
        /// <summary>Value of the passive element in base units.</summary>
        public double Value;
        /// <summary>String representation of the value with unit.</summary>
        public string ValueStr;

        /// <summary>
        /// Creates the instance.
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        public Passive2Pin(string Name) : base(Name)
        {
            this.Power = new Pin[0];
            this.Ground = new Pin[0];

            this.Passive = new Pin[2];
            this.Passive[0] = new Pin(this, "1", "1");
            this.Passive[1] = new Pin(this, "2", "2");
        }

        /// <summary>
        /// Creates the instance.
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="Value">Value of the passive element in base units.</param>
        /// <param name="ValueStr">String representation of the value with unit.</param>
        public Passive2Pin(string Name, double Value, string ValueStr) : this(Name)
        {
            this.Value = Value;
            this.ValueStr = ValueStr;
        }

        /// <summary>
        /// Get the other pin of the 2-pin passive.
        /// </summary>
        /// <param name="OnePin">Pin object to start.</param>
        /// <returns>Opposite pin of OnePin.</returns>
        public Pin OtherPin(Pin OnePin)
        {
            if (OnePin == Passive[0])
                return Passive[1];
            else
                return Passive[0];
        }
    }

    /// <summary>
    /// A class for capacitors.
    /// </summary>
    public class Capacitor : Passive2Pin
    {
        /// <summary>
        /// Creates the Capacitor instance.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public Capacitor(string Name) : base(Name) { }

        /// <summary>
        /// Creates the Capacitor instance.
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="Value">Value of the passive element in base units.</param>
        /// <param name="ValueStr">String representation of the value with unit.</param>
        public Capacitor(string Name, double Value, string ValueStr) : base(Name, Value, ValueStr) { }

    }


    /// <summary>
    /// A class for diodes.
    /// </summary>
    public class Diode : Passive2Pin
    {
        /// <summary>Index of the Cathode in the passive pin array.</summary>
        private int kidx;
        /// <summary>Index of the Anode in the passive pin array.</summary>
        private int aidx;

        /// <summary>
        /// Creates the Diode instance.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public Diode(string Name) : base(Name)
        {
            this.Kidx = 0;
        }

        /// <summary>
        /// Creates the Diode instance.
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="Value">Value of the passive element in base units.</param>
        /// <param name="ValueStr">String representation of the value with unit.</param>
        public Diode(string Name, double Value, string ValueStr) : base(Name, Value, ValueStr) { }


        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);

            for (int i=0; i<this.Passive.Length; i++)
            {
                if (this.Passive[i].ConnectedNet != null)
                    this.Passive[i].SetOutState(this.Passive[i].ConnectedNet.GetState(Time));
            }
        }


        /// <summary>
        /// Gets or sets the index of the Cathode in the Passives array.
        /// </summary>
        public int Kidx
        {
            get { return this.kidx; }
            set
            {
                if (this.kidx == 0)
                {
                    this.Passive[0] = new Pin(this, "K", "1");
                    this.Passive[1] = new Pin(this, "A", "2");
                }
                else if (this.kidx == 1)
                {
                    this.Passive[0] = new Pin(this, "A", "1");
                    this.Passive[1] = new Pin(this, "K", "2");
                }
                else throw new Exception("Invalid Kathode Index!");
                this.kidx = value;
                this.aidx = value ^ 1;
            }
        }

        /// <summary>
        /// Returns the Cathode Pin reference.
        /// </summary>
        public Pin Cathode
        {
            get { return Passive[kidx]; }
        }

        /// <summary>
        /// Returns the Anode Pin reference.
        /// </summary>
        public Pin Anode
        {
            get { return Passive[aidx]; }
        }
    }


    /// <summary>
    /// A class for inductors.
    /// </summary>
    public class Inductor : Passive2Pin
    {
        /// <summary>
        /// Creates the Inductor instance.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public Inductor(string Name) : base(Name) { }

        /// <summary>
        /// Creates the Inductor instance.
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="Value">Value of the passive element in base units.</param>
        /// <param name="ValueStr">String representation of the value with unit.</param>
        public Inductor(string Name, double Value, string ValueStr) : base(Name, Value, ValueStr) { }
    }

    /// <summary>
    /// A class for resistors.
    /// </summary>
    public class Resistor : Passive2Pin
    {
        /// <summary>
        /// Creates the Resistor instance.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public Resistor(string Name) : base(Name) { }

        /// <summary>
        /// Creates the Resistor instance.
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="Value">Value of the passive element in base units.</param>
        /// <param name="ValueStr">String representation of the value with unit.</param>
        public Resistor(string Name, double Value, string ValueStr) : base(Name, Value, ValueStr) { }
    }

    /// <summary>
    /// A class for 2-pin switches.
    /// </summary>
    public class Switch : Passive2Pin
    {
        /// <summary>
        /// Creates the Switch instance.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public Switch(string Name) : base(Name) { }

        /// <summary>
        /// Creates the Switch instance.
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="Value">Value of the passive element in base units.</param>
        /// <param name="ValueStr">String representation of the value with unit.</param>
        public Switch(string Name, double Value, string ValueStr) : base(Name, Value, ValueStr) { }

    }


    /// <summary>
    /// A class for Crystals.
    /// </summary>
    public class Crystal : Passive2Pin
    {
        /// <summary>
        /// Creates the Crystal instance.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public Crystal(string Name) : base(Name) { }

        /// <summary>
        /// Creates the Crystal instance.
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="Value">Value of the passive element in base units.</param>
        /// <param name="ValueStr">String representation of the value with unit.</param>
        public Crystal(string Name, double Value, string ValueStr) : base(Name, Value, ValueStr) { }
    }

    /// <summary>
    /// A class for resistor networks.
    /// </summary>
    public class ResistorNetwork:BaseElement
    {
        /// <summary>Array of resistors.</summary>
        private Resistor[] RN;

        /// <summary>The value in base units for all resistors.</summary>
        private double value;
        /// <summary>String representation of the value with unit.</summary>
        private string valueStr;
        /// <summary>True, if the resistors have a common pin.</summary>
        private bool commonPin = false;

        /// <summary>
        /// Creates the inctance of ResistorNetwork with common pin.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public ResistorNetwork(string Name) : this(Name, 0, true) { }

        /// <summary>
        /// Creates the inctance of ResistorNetwork with common pin.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        /// <param name="N">Number of resistors.</param>
        public ResistorNetwork(string Name, int N) : this(Name, N, true) { }

        /// <summary>
        /// Creates the inctance of ResistorNetwork.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        /// <param name="N">Number of resistors.</param>
        /// <param name="CommonPin">True to define a resistor network with a common pin.</param>
        public ResistorNetwork(string Name, int N, bool CommonPin) : base(Name)
        {
            this.Power = new Pin[0];
            this.Ground = new Pin[0];
            this.commonPin = CommonPin;
            if (N > 0)
                SetN(N);
            else
            {
                Passive = new Pin[0];
                RN = new Resistor[0];
            }
        }

        /// <summary>
        /// Creates the ResistorNetwork instance.
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="N">Number of resistors.</param>
        /// <param name="Value">Value of the passive element in base units.</param>
        /// <param name="ValueStr">String representation of the value with unit.</param>
        public ResistorNetwork(string Name, int N, double Value, string ValueStr) : this(Name, N)
        {
            this.value = Value;
            this.valueStr = ValueStr;
        }

        /// <summary>
        /// Creates the ResistorNetwork instance.
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="N">Number of resistors.</param>
        /// <param name="CommonPin">True to define a resistor network with a common pin.</param>
        /// <param name="Value">Value of the passive element in base units.</param>
        /// <param name="ValueStr">String representation of the value with unit.</param>
        public ResistorNetwork(string Name, int N, bool CommonPin, double Value, string ValueStr) : this(Name, N, CommonPin)
        {
            this.value = Value;
            this.valueStr = ValueStr;
        }


        /// <summary>
        /// Set the number of resistors in the network.
        /// </summary>
        /// <param name="N">Number of resistors.</param>
        private void SetN(int N)
        {
            if (commonPin)
            {
                this.Passive = new Pin[N + 1];
                this.Passive[0] = new Pin(this, "1", "1");
                RN = new Resistor[N];
                for (int i = 0; i < N; i++)
                {
                    Passive[i + 1] = new Pin(this, (i + 2).ToString(), (i + 2).ToString());
                    RN[i] = new Resistor(Name + i.ToString());
                    //RN[i].Passive[0].ConnectedPins.Add(Passive[0]);
                    //RN[i].Passive[1].ConnectedPins.Add(Passive[i + 1]);
                    RN[i].Passive[0] = Passive[0];
                    RN[i].Passive[1] = Passive[i + 1];
                }
            }
            else
            {
                this.Passive = new Pin[2 * N];
                RN = new Resistor[N];
                for (int i = 0; i < N; i++)
                {
                    Passive[i] = new Pin(this, (i + 1).ToString(), (i + 1).ToString());
                    Passive[i + N] = new Pin(this, (i + N + 1).ToString(), (i + N + 1).ToString());

                    RN[i] = new Resistor(Name + i.ToString());
                    //RN[i].Passive[0].ConnectedPins.Add(Passive[i]);
                    //RN[i].Passive[1].ConnectedPins.Add(Passive[i + N]);
                }
            }


        }

        /// <summary>
        /// Find the resistor object connected to this pin.
        /// </summary>
        /// <param name="pin">Pin to check for.</param>
        /// <returns>Individual resistor object connected to this pin.</returns>
        public Resistor FindResistor(Pin pin)
        {
            foreach (Resistor resistor in RN)
                if ((resistor.Passive[0] == pin) || (resistor.Passive[1] == pin))
                    return resistor;

            return null;
        }

        /// <summary>
        /// Gets a specific resistor object in the array.
        /// </summary>
        /// <param name="Idx">Index of the resistor in the array.</param>
        /// <returns>Resistor object at that index.</returns>
        public Resistor this[int Idx]
        {
            get { return RN[Idx]; }
        }

        /// <summary>
        /// Gets or sets the number of resistors.
        /// </summary>
        public int N
        {
            get { return RN.Length; }
            set { SetN(value); }
        }

        /// <summary>
        /// True, if the resistors in the network have a common pin.
        /// </summary>
        public bool CommonPin
        {
            get { return commonPin; }
            set
            {
                commonPin = value;
                SetN(N);
            }
        }

        /// <summary>
        /// Gets or sets the value of the resistors.
        /// </summary>
        public double Value
        {
            get { return value; }
            set
            {
                this.value = value;
                foreach(Resistor r in RN)
                    r.Value = value;
            }
        }

        /// <summary>
        /// Gets or sets the string representation of the value.
        /// </summary>
        public string ValueStr
        {
            get { return valueStr; }
            set
            {
                this.valueStr = value;
                foreach (Resistor r in RN)
                    r.ValueStr = value;
            }
        }

    }

    public class Potentiometer : BaseElement
    {
        /// <summary>Value of the passive element in base units.</summary>
        public double Value;
        /// <summary>String representation of the value with unit.</summary>
        public string ValueStr;

        /// <summary>
        /// Creates the instance.
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        public Potentiometer(string Name) : base(Name)
        {
            this.Power = new Pin[0];
            this.Ground = new Pin[0];

            this.Passive = new Pin[3];
            this.Passive[0] = new Pin(this, "1", "1");
            this.Passive[1] = new Pin(this, "2", "2");
            this.Passive[2] = new Pin(this, "3", "3");
        }


    }

}
